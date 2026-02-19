// MyPal: Modern School System (Skyward + mySchoolBucks inspired, now with modern web UI!)
// Features: Per-user authentication, parent payments, student/teacher roles, statement privacy, grade management
// This file is a React App that you can deploy on Netlify/Vercel (see package.json & README instructions)

// To run locally: npx create-react-app mypal && copy content; then npm start

import React, { useState } from "react";
import "./MyPal.css"; // You'll need to create a modern sleek CSS file!

// --- Core Classes (unchanged logic, improved for React state) ---

const bcrypt = {
  hashSync: (pw) => "hashed_" + pw,
  compareSync: (pw, hash) => hash === "hashed_" + pw,
};

class User {
  constructor(username, password, type, refId) {
    this.username = username;
    this.passwordHash = bcrypt.hashSync(password);
    this.type = type;
    this.refId = refId;
  }
  authenticate(password) {
    return bcrypt.compareSync(password, this.passwordHash);
  }
}

class Student {
  constructor(id, name, gradeLevel) {
    this.id = id;
    this.name = name;
    this.gradeLevel = gradeLevel;
    this.statements = [];
  }
  addStatement(statement) {
    this.statements.push(statement);
  }
  getStatementForTerm(term) {
    return this.statements.find((s) => s.term === term);
  }
}

class Teacher {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

class Statement {
  constructor(term, courses = []) {
    this.term = term;
    this.courses = courses;
    this.balanceDue = 0;
    this.payments = [];
  }
  addCourse(course) {
    this.courses.push(course);
  }
  assignGrade(courseName, grade) {
    const course = this.courses.find((c) => c.name === courseName);
    if (course) course.grade = grade;
  }
  dropCourse(courseName) {
    this.courses = this.courses.filter((c) => c.name !== courseName);
  }
  addFee(amount, reason) {
    this.balanceDue += amount;
    this.payments.push({ amount: -amount, reason, date: new Date() });
  }
  makePayment(amount, parentName) {
    if (amount <= 0) throw new Error("Invalid amount");
    this.balanceDue -= amount;
    this.payments.push({ amount, parentName, date: new Date() });
  }
  statementSummary() {
    return {
      term: this.term,
      courses: this.courses.map((c) => ({
        name: c.name,
        teacher: c.teacher,
        grade: c.grade,
      })),
      balanceDue: this.balanceDue,
      payments: this.payments,
    };
  }
}

class MyPalDatabase {
  constructor() {
    this.students = [];
    this.teachers = [];
    this.users = [];
  }

  addStudent({ id, name, gradeLevel, username, password }) {
    if (this.students.find((s) => s.id === id))
      throw new Error("Student exists");
    if (this.users.find((u) => u.username === username))
      throw new Error("Username taken");
    const student = new Student(id, name, gradeLevel);
    this.students.push(student);
    this.users.push(new User(username, password, "student", id));
    return student;
  }

  addTeacher({ id, name, username, password }) {
    if (this.teachers.find((t) => t.id === id))
      throw new Error("Teacher exists");
    if (this.users.find((u) => u.username === username))
      throw new Error("Username taken");
    const teacher = new Teacher(id, name);
    this.teachers.push(teacher);
    this.users.push(new User(username, password, "teacher", id));
    return teacher;
  }

  authenticateUser(username, password) {
    const user = this.users.find((u) => u.username === username);
    if (!user) return null;
    return user.authenticate(password) ? user : null;
  }

  getStudentByUser(user) {
    if (user.type !== "student") throw new Error("Not a student user");
    return this.students.find((s) => s.id === user.refId);
  }
  getTeacherByUser(user) {
    if (user.type !== "teacher") throw new Error("Not a teacher user");
    return this.teachers.find((t) => t.id === user.refId);
  }
  getStudent(id) {
    return this.students.find((s) => s.id === id);
  }

  teacherAddStatement(teacherUser, studentId, term, courses) {
    this._ensureTeacher(teacherUser);
    const student = this.getStudent(studentId);
    if (!student) throw new Error("Student not found");
    student.addStatement(new Statement(term, courses));
  }

  teacherAssignGrade(teacherUser, studentId, term, courseName, grade) {
    this._ensureTeacher(teacherUser);
    const student = this.getStudent(studentId);
    if (!student) throw new Error("Student not found");
    const statement = student.getStatementForTerm(term);
    if (!statement) throw new Error("Statement not found");
    statement.assignGrade(courseName, grade);
  }

  teacherAddCourse(teacherUser, studentId, term, course) {
    this._ensureTeacher(teacherUser);
    const student = this.getStudent(studentId);
    if (!student) throw new Error("Student not found");
    const statement = student.getStatementForTerm(term);
    if (!statement) throw new Error("Statement not found");
    statement.addCourse(course);
  }

  teacherDropCourse(teacherUser, studentId, term, courseName) {
    this._ensureTeacher(teacherUser);
    const student = this.getStudent(studentId);
    if (!student) throw new Error("Student not found");
    const statement = student.getStatementForTerm(term);
    if (!statement) throw new Error("Statement not found");
    statement.dropCourse(courseName);
  }

  parentPay(user, amount, term) {
    this._ensureStudent(user);
    const student = this.getStudentByUser(user);
    const statement = student.getStatementForTerm(term);
    if (!statement) throw new Error("Statement not found");
    statement.makePayment(amount, student.name + " Parent");
  }

  viewStudentDashboard(user) {
    this._ensureStudent(user);
    const student = this.getStudentByUser(user);
    return student.statements.map((s) => s.statementSummary());
  }
  viewTeacherStudentGrades(teacherUser, studentId, term) {
    this._ensureTeacher(teacherUser);
    const student = this.getStudent(studentId);
    if (!student) throw new Error("Student not found");
    const statement = student.getStatementForTerm(term);
    return statement ? statement.statementSummary() : {};
  }
  chargeAll(term, amount, reason) {
    for (const student of this.students) {
      let statement = student.getStatementForTerm(term);
      if (statement) {
        statement.addFee(amount, reason);
      }
    }
  }
  _ensureStudent(user) {
    if (user.type !== "student") throw new Error("Not authorized: student only");
  }
  _ensureTeacher(user) {
    if (user.type !== "teacher") throw new Error("Not authorized: teacher only");
  }
}

// --- DEMO INITIALIZATION ---
const db = new MyPalDatabase();
db.addTeacher({ id: 21, name: "Chris Elm", username: "chrise", password: "teachpass1" });
db.addStudent({ id: 1, name: "Alice Smith", gradeLevel: 7, username: "alice7", password: "studentalice" });
db.addStudent({ id: 2, name: "Bob Lee", gradeLevel: 8, username: "boblee8", password: "studentbob" });

db.teacherAddStatement(
  db.authenticateUser("chrise", "teachpass1"),
  1,
  "2023 Fall",
  [
    { name: "Math", teacher: "Chris Elm", grade: null },
    { name: "Science", teacher: "Chris Elm", grade: null },
  ]
);
db.teacherAssignGrade(
  db.authenticateUser("chrise", "teachpass1"),
  1,
  "2023 Fall",
  "Math",
  "A-"
);
db.teacherAssignGrade(
  db.authenticateUser("chrise", "teachpass1"),
  1,
  "2023 Fall",
  "Science",
  "B+"
);
db.teacherAddCourse(
  db.authenticateUser("chrise", "teachpass1"),
  1,
  "2023 Fall",
  { name: "Art", teacher: "Ms. Willow", grade: null }
);
db.teacherAssignGrade(
  db.authenticateUser("chrise", "teachpass1"),
  1,
  "2023 Fall",
  "Art",
  "A"
);
db.teacherDropCourse(
  db.authenticateUser("chrise", "teachpass1"),
  1,
  "2023 Fall",
  "Art"
);
// Add some fees and partial payments
db.chargeAll("2023 Fall", 20, "Lunch");
const aliceUser = db.authenticateUser("alice7", "studentalice");
db.parentPay(aliceUser, 15, "2023 Fall");

// --- UI ---

function ModernHeader({ title, children }) {
  return (
    <div className="mypal-header">
      <div className="mypal-header-title">{title}</div>
      {children}
    </div>
  );
}
function Card({ children }) {
  return <div className="mypal-card">{children}</div>;
}
function Divider() {
  return <div className="mypal-divider"></div>;
}

function ErrorAlert({ error, clear }) {
  if (!error) return null;
  return (
    <div className="mypal-error">
      {error}
      <button onClick={clear}>×</button>
    </div>
  );
}

function LoginScreen({ doLogin, error }) {
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");
  return (
    <div className="mypal-login-bg">
      <Card>
        <ModernHeader title="MyPal ⛅ Login" />
        <form
          onSubmit={e => {
            e.preventDefault();
            doLogin(username, password);
          }}
        >
          <div>
            <input
              className="mypal-input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUser(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <input
              className="mypal-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPass(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <button type="submit" className="mypal-btn">
              Login
            </button>
          </div>
          <ErrorAlert error={error} clear={() => {}} />
        </form>
        <Divider />
        <div style={{ fontSize: 13, color: "#888" }}>
          Try student: <b>alice7/studentalice</b> or teacher: <b>chrise/teachpass1</b>
        </div>
      </Card>
    </div>
  );
}

// --- Student Dashboard UI ---
function StudentDashboard({ user, logout, db }) {
  let student;
  try {
    student = db.getStudentByUser(user);
  } catch (e) {
    return <ErrorAlert error={e.message} clear={logout} />;
  }
  const statements = student.statements.map(s => s.statementSummary());
  const [payAmount, setPayAmount] = useState("");
  const [error, setError] = useState(null);

  // Find latest term for payment (simulate)
  const term = statements.length > 0 ? statements[statements.length - 1].term : "";

  function payNow(e) {
    e.preventDefault();
    try {
      db.parentPay(user, parseFloat(payAmount), term);
      setPayAmount("");
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <ModernHeader title={`Welcome, ${student.name}!`}>
        <button className="mypal-logout-btn" onClick={logout}>
          Logout
        </button>
      </ModernHeader>
      <div>
        {statements.map((stmt, idx) => (
          <Card key={idx}>
            <b>Term:</b> {stmt.term}
            <br />
            <b>Courses:</b>
            <ul>
              {stmt.courses.map((c, i) => (
                <li key={i}>
                  {c.name} ({c.teacher}) - <b>{c.grade || "N/A"}</b>
                </li>
              ))}
            </ul>
            <div>
              <b>Balance Due:</b> <span className={stmt.balanceDue > 0 ? "mypal-red" : ""}>${stmt.balanceDue}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <b>Payments:</b>
              <ul>
                {stmt.payments.length === 0 && <li>No payments yet.</li>}
                {stmt.payments.map((p, i) => (
                  <li key={i}>
                    {p.amount > 0 ? "+" : ""}
                    {p.amount} ({p.reason || p.parentName}) {p.date ? new Date(p.date).toLocaleString() : ""}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
        <Divider />
        <form onSubmit={payNow} style={{ margin: "18px 0" }}>
          <label>
            <b>Make a Payment for {term}:</b>
            <input
              className="mypal-input"
              type="number"
              value={payAmount}
              min={1}
              max={statements[statements.length - 1]?.balanceDue || 10000}
              onChange={e => setPayAmount(e.target.value)}
              placeholder="Amount"
              style={{ marginLeft: 10, width: 100 }}
            />
          </label>
          <button className="mypal-btn" type="submit" style={{ marginLeft: 8 }}>
            Pay
          </button>
          <ErrorAlert error={error} clear={() => setError(null)} />
        </form>
      </div>
    </div>
  );
}

// --- Teacher Dashboard ---
function TeacherDashboard({ user, logout, db }) {
  let teacher;
  try {
    teacher = db.getTeacherByUser(user);
  } catch (e) {
    return <ErrorAlert error={e.message} clear={logout} />;
  }
  const students = db.students;

  // UI state for selected student, term, etc.
  const [selected, setSelected] = useState({
    studentId: students.length > 0 ? students[0].id : "",
    term: "2023 Fall",
  });
  const [gradeEdits, setGradeEdits] = useState({});
  const [error, setError] = useState(null);

  const handleGradeEdit = (courseName, value) => {
    setGradeEdits(edits => ({ ...edits, [courseName]: value }));
  };

  function assignGrade(courseName) {
    try {
      db.teacherAssignGrade(user, selected.studentId, selected.term, courseName, gradeEdits[courseName]);
      setGradeEdits(edits => ({ ...edits, [courseName]: "" }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  let statement = {};
  try {
    statement = db.viewTeacherStudentGrades(user, selected.studentId, selected.term);
  } catch (e) {
    setError(e.message);
  }
  const selectedStudent = db.students.find(s => s.id === selected.studentId);

  return (
    <div>
      <ModernHeader title={`Teacher Portal (${teacher.name})`}>
        <button className="mypal-logout-btn" onClick={logout}>
          Logout
        </button>
      </ModernHeader>
      <Card>
        <div>
          <label>
            <b>Student:</b>
            <select
              className="mypal-input"
              value={selected.studentId}
              onChange={e => setSelected(sel => ({ ...sel, studentId: parseInt(e.target.value) }))}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ marginLeft: 12 }}>
            <b>Term:</b>
            <input
              className="mypal-input"
              value={selected.term}
              onChange={e => setSelected(sel => ({ ...sel, term: e.target.value }))}
            />
          </label>
        </div>
      </Card>
      <Card>
        <b>Courses:</b>
        <ul>
          {(statement.courses || []).map((c, idx) => (
            <li key={idx}>
              {c.name} ({c.teacher}):&nbsp;
              <input
                className="mypal-input"
                style={{ width: 60 }}
                placeholder={c.grade || "-"}
                value={gradeEdits[c.name] ?? ""}
                onChange={e => handleGradeEdit(c.name, e.target.value)}
              />
              <button
                className="mypal-btn"
                style={{ marginLeft: 5, fontSize: 13, padding: "4px 12px" }}
                onClick={() => assignGrade(c.name)}
              >
                Set
              </button>
              &nbsp;Current:&nbsp;<span style={{ fontWeight: "bold" }}>{c.grade || "-"}</span>
            </li>
          ))}
        </ul>
        <Divider />
        <div>
          <b>Balance Due:</b> <span className={statement.balanceDue > 0 ? "mypal-red" : ""}>${statement.balanceDue}</span>
        </div>
        <ErrorAlert error={error} clear={() => setError(null)} />
      </Card>
    </div>
  );
}

// --- Top-level App ---
function App() {
  const [loggedIn, setLoggedIn] = useState(null);
  const [loginError, setLoginError] = useState(null);

  function doLogin(username, password) {
    try {
      const user = db.authenticateUser(username, password);
      if (!user) throw new Error("Invalid username/password");
      setLoggedIn(user);
      setLoginError(null);
    } catch (e) {
      setLoginError(e.message);
    }
  }
  function logout() {
    setLoggedIn(null);
  }
  if (!loggedIn)
    return <LoginScreen doLogin={doLogin} error={loginError} />;
  if (loggedIn.type === "student")
    return <StudentDashboard user={loggedIn} logout={logout} db={db} />;
  if (loggedIn.type === "teacher")
    return <TeacherDashboard user={loggedIn} logout={logout} db={db} />;
  return <div>Unknown user type.</div>;
}

export default App;

// -------------- MyPal.css PROTOTYPE (save as MyPal.css in same directory) --------------
// .mypal-header { background: #f0f7fb; border-radius: 12px; margin: 16px auto 16px auto; padding: 16px 24px 12px 24px; box-shadow: 0 2px 12px #beccdd3d; display: flex; align-items: center; justify-content: space-between; }
// .mypal-header-title { color: #1e90ff; font-size: 1.5em; font-weight: 900; letter-spacing: 0.01em; }
// .mypal-card { background: #fff; border-radius: 10px; box-shadow: 0 2px 12px #d0deec4d; margin: 16px auto; padding: 18px 26px; max-width: 550px; transition: box-shadow .2s; }
// .mypal-input { padding: 8px 13px; border: 1px solid #cddbe9; border-radius: 6px; outline: none; margin: 4px 0; font-size: 15px; }
// .mypal-btn { padding: 8px 16px; background: #1e90ff; color: #fff; border: none; border-radius: 7px; font-weight: 600; margin: 2px; cursor: pointer; transition: background .1s; }
// .mypal-btn:hover { background: #006ad1; }
// .mypal-divider { border-bottom: 1px solid #c8d3e1; margin: 18px 0; }
// .mypal-red { color: #d3001f; }
// .mypal-error { background: #ffdbe7; color: #c80038; border-radius: 7px; padding: 10px 18px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; }
// .mypal-login-bg { min-height: 100vh; background: linear-gradient(to top right, #d7e9fc 0%, #f6fafd 55%, #e2e4eb 100%); display: flex; align-items: center; justify-content: center; }
// .mypal-logout-btn { background: #fcfcfc; color: #1e90ff; border: 1px solid #c7e2ff; border-radius: 8px; margin-left: 20px; font-weight: 500; cursor: pointer; padding: 7px 18px; }

// -------------- End CSS PROTOTYPE --------------

// This file is now a deployable modern React web app with a sleek interface!
//
