import React, { useState, useEffect } from 'react';

export default function Students() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch students data
        const fetchStudents = async () => {
            try {
                // Replace with your API endpoint
                const response = await fetch('/api/students');
                const data = await response.json();
                setStudents(data);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="students-container">
            <h1>Students</h1>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Grade</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((student) => (
                        <tr key={student.id}>
                            <td>{student.name}</td>
                            <td>{student.email}</td>
                            <td>{student.grade}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}