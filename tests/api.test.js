const request = require("supertest");
const path = require("path");
const fs = require("fs");
const { app, server } = require("../server");
const { FOLDERS } = require("../utils/storage");
const Client = require("socket.io-client");

const TEST_PORT = 5001;
const SOCKET_URL = `http://localhost:${TEST_PORT}`;

// Helper to clean files
const cleanFile = (p) => { if (fs.existsSync(p)) fs.unlinkSync(p); };
const cleanDir = (p) => { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); };

const STUDENT = {
    userType: "student",
    id: "test_st_01",
    password: "pass",
    firstName: "Test",
    lastName: "Student",
    department: "TEST_CST",
    semester: "1st",
    shift: "Morning"
};

describe("API & Socket Integration Tests", () => {
    let clientSocket;

    beforeAll((done) => {
        server.listen(TEST_PORT, () => done());
    });

    afterAll((done) => {
        if (clientSocket && clientSocket.connected) clientSocket.disconnect();

        // Cleanup created data
        cleanFile(path.join(FOLDERS.STUDENTS, `${STUDENT.id}.json`));
        cleanDir(path.join(FOLDERS.EVENTS, "TEST_DEPT"));
        cleanDir(path.join(FOLDERS.SCHEDULES, "TEST_DEPT"));

        // Cleanup Uploads
        const files = fs.readdirSync(FOLDERS.UPLOADS);
        files.forEach(f => {
            if (f.includes("test_image")) cleanFile(path.join(FOLDERS.UPLOADS, f));
        });

        server.close(done);
    });

    describe("Authentication", () => {
        test("POST /auth/create - Register Student", async () => {
            const res = await request(app).post("/api/auth/create").send(STUDENT);
            expect(res.statusCode).toBe(200);
            expect(res.body.data.role).toBe("student");
        });

        test("POST /auth/create - Duplicate ID check", async () => {
            const res = await request(app).post("/api/auth/create").send(STUDENT);
            expect(res.body.message).toBe("duplicate");
        });

        test("POST /auth/login - Valid Login", async () => {
            const res = await request(app).post("/api/auth/login").send({
                userId: STUDENT.id,
                password: STUDENT.password
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.role).toBe("student");
        });

        test("POST /auth/login - Invalid Password", async () => {
            const res = await request(app).post("/api/auth/login").send({
                userId: STUDENT.id,
                password: "wrong"
            });
            expect(res.statusCode).toBe(401);
        });
    });

    describe("Announcements", () => {
        let annId;
        test("POST /announcements - Create", async () => {
            const res = await request(app).post("/api/announcements").send({
                title: "Jest Test",
                body: "Body content",
                createdBy: "Tester"
            });
            expect(res.statusCode).toBe(200);
            annId = res.body.id;
        });

        test("GET /announcements - Retrieve", async () => {
            const res = await request(app).get("/api/announcements");
            expect(res.statusCode).toBe(200);
            expect(res.body.some(a => a.id === annId)).toBe(true);
        });

        test("DELETE /announcements - Remove", async () => {
            const res = await request(app).delete(`/api/announcements/${annId}`);
            expect(res.statusCode).toBe(200);
        });
    });

    describe("Resources (Events/Schedule)", () => {
        test("POST /events - Create Event", async () => {
            const res = await request(app).post("/api/events").send({
                department: "TEST_DEPT", semester: "1st", shift: "Day",
                title: "Exam", body: "Finals"
            });
            expect(res.statusCode).toBe(200);
        });

        test("GET /events - Fetch Events", async () => {
            const res = await request(app).get("/api/events/TEST_DEPT/1st/Day");
            expect(res.statusCode).toBe(200);
            expect(res.body[0].title).toBe("Exam");
        });

        test("GET /schedules - Empty List (No 500 Error)", async () => {
            const res = await request(app).get("/api/schedules/TEST_DEPT/1st/Day");
            // Should return empty array, not crash
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    describe("File Uploads", () => {
        test("POST /upload - Handle multipart", async () => {
            const res = await request(app)
                .post("/api/upload")
                .attach("images", Buffer.from("fake_img"), "test_image.png");
            expect(res.statusCode).toBe(200);
            expect(res.body.files).toHaveLength(1);
        });
    });

    describe("WebSockets", () => {
        beforeEach((done) => {
            clientSocket = new Client(SOCKET_URL, { path: "/socket.io" });
            clientSocket.on("connect", done);
        });

        afterEach(() => {
            if (clientSocket.connected) clientSocket.disconnect();
        });

        test("Chat - Join Room & Send Message", (done) => {
            const msgData = {
                type: "department", department: "TEST_DEPT", semester: "1st", shift: "Day",
                text: "Socket Test Msg", senderId: STUDENT.id, senderName: "Tester"
            };

            // Join
            clientSocket.emit("joinChatRoom", msgData);

            // Listen for own message echo
            clientSocket.on("newMessage", (msg) => {
                if (msg.text === msgData.text) {
                    expect(msg.senderId).toBe(STUDENT.id);
                    done();
                }
            });

            // Send
            setTimeout(() => {
                clientSocket.emit("sendMessage", msgData);
            }, 50);
        });

        test("Q&A - Ask Question", (done) => {
            const qData = {
                department: "TEST_DEPT",
                text: "Is this working?",
                senderId: STUDENT.id,
                senderName: "Tester"
            };

            clientSocket.emit("joinAskRoom", { department: "TEST_DEPT" });

            clientSocket.on("newQuestion", (q) => {
                if (q.text === qData.text) {
                    expect(q.answers).toEqual([]);
                    done();
                }
            });

            setTimeout(() => {
                clientSocket.emit("askQuestion", qData);
            }, 50);
        });
    });
});