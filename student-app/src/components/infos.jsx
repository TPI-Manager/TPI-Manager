// Info কম্পোনেন্ট যা লগইন করা স্টুডেন্টের তথ্য প্রদর্শন করে
export default function Infos({ student }) {
  if (!student) return null;
 let { name, email, phone, studentId, password, className,roll,address,semester,shift,guardianName,guardianPhone } = student;
  const maskedId = `${studentId.slice(0, 2)}******${studentId.slice(-2)}`;
  
  return (
      
    <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc" }}>
      <pre>{JSON.stringify(student, null, 10)}</pre>
    
      <h1>{name}</h1>
     
<h1>Student ID: {maskedId}</h1>
      <h2>Email: {email}</h2>
      <h2>Phone: {phone}</h2>
      <h2>Class: {className}</h2>
      <h2>Roll: {roll}</h2>
     

    </div>
  );
}
