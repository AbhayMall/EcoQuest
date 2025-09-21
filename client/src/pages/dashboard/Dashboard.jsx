import { useEffect, useState, useRef } from 'react'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import CourseDetail from './CourseDetail.jsx'
import TeacherDashboard from './TeacherDashboard.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import Community from './Community.jsx'
import Progress from './Progress.jsx'
import Badges from './Badges.jsx'
import Competitions from './Competitions.jsx'
import QuizPlay from './QuizPlay.jsx'
import AssignmentSubmit from './AssignmentSubmit.jsx'
import axios from 'axios'
import api from '../../api'
import '../css/student.css'

function Nav({ role }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">EcoLearn</div>
      <div className="sidebar-section">General</div>
      <Link className="sidebar-link" to="/app">Overview</Link>
      {role === 'student' && <>
        <div className="sidebar-section">Student</div>
        <Link className="sidebar-link" to="/app/courses">Courses</Link>
        <Link className="sidebar-link" to="/app/progress">Progress</Link>
        <Link className="sidebar-link" to="/app/badges">Badges</Link>
        <Link className="sidebar-link" to="/app/leaderboard">Leaderboard</Link>
        <Link className="sidebar-link" to="/app/competitions">Competitions</Link>
        <Link className="sidebar-link" to="/app/community">Community</Link>
      </>}
      {role === 'teacher' && <>
        <div className="sidebar-section">Teacher</div>
        <Link className="sidebar-link" to="/app/teacher">Dashboard</Link>
      </>}
      {role === 'admin' && <>
        <div className="sidebar-section">Admin</div>
        <Link className="sidebar-link" to="/app/admin">Overview</Link>
      </>}
      <div className="sidebar-section">Account</div>
      <Link className="sidebar-link" to="/app/notifications">Notifications</Link>
    </aside>
  )
}

function Home() {
  const user = JSON.parse(localStorage.getItem('ecolearn_user') || '{}')
  return <div>Welcome, {user.name || 'User'}!</div>
}

function Courses() {
  const [courses, setCourses] = useState([])
  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data.data || [])).
      catch(() => setCourses([]))
  }, [])
  return (
    <div>
      <h3>Courses</h3>
      <ul>
        {courses.map(c => <li key={c._id}><Link to={`/app/courses/${c._id}`}>{c.title} — {c?.teacher?.name}</Link></li>)}
      </ul>
    </div>
  )
}

function Leaderboard() {
  const [topStudents, setTopStudents] = useState([]);
  
  useEffect(() => { 
    // Fetch top 3 students by ecoPoints
    api.get('/admin/leaderboard').then(r => {
      const sorted = (r.data.data || [])
        .sort((a, b) => b.student.ecoPoints - a.student.ecoPoints)
        .slice(0, 3);
      setTopStudents(sorted);
    }).catch(() => setTopStudents([]));
  }, []);
  
  return (
    <div>
      <h3>Leaderboard - Top 3 Students</h3>
      <ol className="leaderboard-list">
        {topStudents.map((row, index) => (
          <li key={row._id} className="leaderboard-item">
            <span className="rank">{index + 1}</span>
            <span className="name">{row.student?.name}</span>
            <span className="points">{row.student?.ecoPoints || 0} ecoPoints</span>
          </li>
        ))}
      </ol>
      {topStudents.length === 0 && <p>No leaderboard data available</p>}
    </div>
  );
}

function Notifications() {
  const [items, setItems] = useState([]);
  
  useEffect(() => { 
    api.get('/notifications').then(r => setItems(r.data.data || [])).catch(() => setItems([]));
  }, []);
  
  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setItems(items.map(item => 
        item._id === id ? { ...item, isRead: true } : item
      ));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  return (
    <div>
      <h3>Notifications</h3>
      <div className="notification-list">
        {items.length === 0 && <p>No notifications</p>}
        {items.map(n => (
          <div key={n._id} className={`notification-item ${n.isRead ? 'read' : 'unread'}`}>
            <div className="notification-header">
              <strong>{n.title}</strong>
              {!n.isRead && (
                <button 
                  className="btn btn-sm" 
                  onClick={() => markAsRead(n._id)}
                >
                  Mark Read
                </button>
              )}
            </div>
            <div className="notification-body">{n.body}</div>
            <div className="notification-time">
              {new Date(n.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [teacherStatus, setTeacherStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [approvedTeachers, setApprovedTeachers] = useState([])
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([])
  const [selectedTeachers, setSelectedTeachers] = useState([])
  const [teacherCourses, setTeacherCourses] = useState([])
  const [progressList, setProgressList] = useState([])
  const [showTeacherSelect, setShowTeacherSelect] = useState(false)
  const [showTeacherCourses, setShowTeacherCourses] = useState(false)
  const [showProgress, setShowProgress] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('ecolearn_user')
    if (!raw) return navigate('/login')
    const userData = JSON.parse(raw)
    setUser(userData)
    if (userData.role === 'teacher') {
      api.get('/teachers/me').then(r => setTeacherStatus(r.data.data)).catch(()=>setTeacherStatus({ isApproved: false })).finally(()=>setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'student') return
    
    // Load approved teachers
    api.get('/teachers/approved').then(r => {
      console.log('Approved teachers:', r.data);
      setApprovedTeachers(r.data.data || []);
    }).catch(() => setApprovedTeachers([]));
    
    // Load progress
    api.get('/progress/me').then(r => setProgressList(r.data.data||[])).catch(()=>setProgressList([]));
    
    // Load selected teachers
    api.get('/auth/me/selected-teachers').then(r => {
      console.log('Selected teachers:', r.data);
      const selectedTeachersData = r.data.data || [];
      setSelectedTeacherIds(selectedTeachersData.map(t => t.id || t._id));
      setSelectedTeachers(selectedTeachersData);
    }).catch(error => {
      console.error('Error loading selected teachers:', error);
      setSelectedTeacherIds([]);
      setSelectedTeachers([]);
    });
  }, [user?.id])
async function openTeacherResources(teacherId, teacherEmail) {
  try {
    console.log('Loading courses for teacher:', teacherId, teacherEmail);
    
    // Get all courses
    const res = await api.get('/courses');
    console.log('All courses:', res.data.data);
    
    // Filter courses by teacher ID
    const teacherCourses = res.data.data.filter(c => {
      // Check if course.teacher ID matches (could be string or object)
      let courseTeacherId;
      
      if (typeof c.teacher === 'object') {
        // If teacher is an object, it could be {_id: ...} or {$oid: ...}
        if (c.teacher._id) {
          courseTeacherId = c.teacher._id;
        } else if (c.teacher.$oid) {
          courseTeacherId = c.teacher.$oid;
        } else {
          courseTeacherId = null;
        }
      } else {
        // If teacher is a string (the ID)
        courseTeacherId = c.teacher;
      }
      
      return courseTeacherId === teacherId && c.isApproved;
    });
    
    console.log('Filtered teacher courses:', teacherCourses);
    setTeacherCourses(teacherCourses);
    
    if (teacherCourses.length === 0) {
      alert('No courses found for this teacher or the courses are not yet approved.');
    }
  } catch (error) {
    console.error("Failed to load teacher courses:", error);
    setTeacherCourses([]);
    alert('Failed to load courses. Please try again.');
  }
}
  // Add this function to handle course completion
  async function markCourseCompleted(courseId) {
    try {
      // Update progress
      await api.post(`/progress/course/${courseId}/material`);
      
      // Add ecoPoints
      await api.post('/gamification/complete-content', { 
        courseId, 
        points: 10 
      });
      
      // Refresh progress list
      const progressRes = await api.get('/progress/me');
      setProgressList(progressRes.data.data || []);
      
      alert('Course marked as completed! +10 ecoPoints earned!');
    } catch (error) {
      console.error("Failed to mark course completed:", error);
      alert('Failed to mark course as completed');
    }
  }

  if (!user || loading) return <div>Loading...</div>
  if (user.role === 'teacher' && teacherStatus && !teacherStatus.isApproved) {
    return <TeacherOnboarding />
  }

  async function saveSelectedTeachers() {
    try {
      await api.post('/auth/me/selected-teachers', { teacherIds: selectedTeacherIds });
      
      // Update the selected teachers list
      const updatedSelectedTeachers = approvedTeachers.filter(t => 
        selectedTeacherIds.includes(t.id || t._id)
      );
      
      setSelectedTeachers(updatedSelectedTeachers);
      setShowTeacherSelect(false);
    } catch (error) {
      console.error('Failed to save selected teachers:', error);
      alert('Failed to save teacher selection');
    }
  }

  return (
    <div className="layout grid">
      <Nav role={user.role} />
      <main className="content">
        <header className="page-header">
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Welcome, {user.name}</div>
        </header>
        {user.role === 'student' && (
          <div className="cards">
            <div className="card">
              <div className="card-title">Teacher Selection</div>
              <div className="card-body">Choose multiple approved teachers and save</div>
              <button className="btn" onClick={()=>setShowTeacherSelect(true)}>Open</button>
            </div>
            <div className="card">
              <div className="card-title">Selected Teachers & Courses</div>
              <div className="card-body">Open teachers you follow and view their courses/resources</div>
              <button className="btn" onClick={()=>setShowTeacherCourses(true)}>Open</button>
            </div>
            <div className="card">
              <div className="card-title">Notifications</div>
              <div className="card-body">View and reply to messages from teachers/admins</div>
              <Link className="btn" to="notifications">Open</Link>
            </div>
            <div className="card">
              <div className="card-title">Progress & Leaderboard</div>
              <div className="card-body">Track reading, quizzes, and ecoPoints</div>
              <button className="btn" onClick={()=>setShowProgress(true)}>Open</button>
            </div>
            <div className="card">
              <div className="card-title">Leaderboard</div>
              <div className="card-body">See the global ranking</div>
              <Link className="btn" to="leaderboard">Open</Link>
            </div>
            <div className="card">
              <div className="card-title">Community</div>
              <div className="card-body">Join the open community chat</div>
              <button className="btn" onClick={()=>window.open('/community', '_blank', 'noopener,noreferrer')}>Open</button>
            </div>
            <div className="card">
              <div className="card-title">Sort Game</div>
              <div className="card-body">Sort the thing og environment.</div>
              <button className="btn" onClick={()=>window.open('https://hardikm9.github.io/EcoSort/', '_blank', 'noopener,noreferrer')}>Open</button>
            </div>
            <div className="card">
              <div className="card-title">EcoQuest Game</div>
              <div className="card-body">An interactive Puzzle Game with Quiz.</div>
              <button className="btn" onClick={()=>window.open('http://localhost:3000/', '_blank', 'noopener,noreferrer')}>Open</button>
            </div>
            <div className="card">
              <div className="card-title">Tree Game Game</div>
              <div className="card-body">An interactive Tree Game.</div>
              <button className="btn" onClick={()=>window.open('https://joban-grewal.github.io/tree-game-frontend/', '_blank', 'noopener,noreferrer')}>Open</button>
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="quiz/:quizId" element={<QuizPlay />} />
          <Route path="assignments/:assignmentId/submit" element={<AssignmentSubmit />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="app/teacher" element={<TeacherDashboard />} />
          <Route path="app/admin" element={<AdminDashboard />} />
          <Route path="community" element={<Community />} />
          <Route path="progress" element={<Progress />} />
          <Route path="badges" element={<Badges />} />
          <Route path="competitions" element={<Competitions />} />
        </Routes>

        {showTeacherSelect && (
          <div className="modal-overlay" onClick={()=>setShowTeacherSelect(false)}>
            <div className="modal" onClick={(e)=>e.stopPropagation()}>
              <header><h3>Select Teachers</h3><button className="btn secondary" onClick={()=>setShowTeacherSelect(false)}>Close</button></header>
              <div className="modal-body">
                {approvedTeachers.length === 0 && <div>No approved teachers yet.</div>}
                <div className="teacher-cards">
                  {approvedTeachers.map(t => {
                    const teacherId = t.id || t._id;
                    return (
                      <div key={teacherId} className="teacher-card">
                        <div className="teacher-card-header">
                          <h5>{t.name}</h5>
                          <span className="status-badge approved">Approved</span>
                        </div>
                        <div className="teacher-card-body">
                          <div className="teacher-details">
                            <div><strong>Email:</strong> {t.email}</div>
                            <div><strong>Qualification:</strong> {t.qualification || '—'}</div>
                            <div><strong>Contact:</strong> {t.contact || '—'}</div>
                          </div>
                          <div className="teacher-actions">
                            <label style={{display:'flex', alignItems:'center', gap:8}}>
                              <input 
                                type="checkbox" 
                                checked={selectedTeacherIds.includes(teacherId)} 
                                onChange={(e)=>{
                                  setSelectedTeacherIds(prev => 
                                    e.target.checked 
                                      ? [...new Set([...prev, teacherId])] 
                                      : prev.filter(x => x !== teacherId)
                                  )
                                }} 
                              /> 
                              Select Teacher
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn" onClick={saveSelectedTeachers}>Save</button>
              </div>
            </div>
          </div>
        )}

        {showTeacherCourses && (
  <div className="modal-overlay" onClick={() => setShowTeacherCourses(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: 960}}>
      <header>
        <h3>Selected Teachers & Courses</h3>
        <button className="btn secondary" onClick={() => setShowTeacherCourses(false)}>Close</button>
      </header>
      <div className="modal-body">
        <div className="teacher-cards">
          {selectedTeachers.map(t => {
            const teacherId = t.id || t._id;
            return (
              <div key={teacherId} className="teacher-card">
                <div className="teacher-card-header">
                  <h5>{t.name}</h5>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => openTeacherResources(teacherId, t.email)}
                  >
                    Load Courses
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* PASTE THE COURSES DISPLAY CODE RIGHT HERE */}
        <div style={{marginTop: 12}}>
          <h4>Courses</h4>
          {teacherCourses.length === 0 ? (
            <p>No courses available. Click "Load Courses" to see courses from selected teachers.</p>
          ) : (
            <ul className="course-list">
              {teacherCourses.map(c => {
                const courseProgress = progressList.find(p => p.course?._id === c._id);
                const isCompleted = courseProgress?.progressPercent === 100;
                
                return (
                  <li key={c._id} className="course-item">
                    <div>
                      <strong>{c.title}</strong>
                      {isCompleted && <span className="badge completed">Completed</span>}
                    </div>
                    <div style={{fontSize: 13, color: '#6b7280'}}>{c.description}</div>
                    
                    {/* Display image if available */}
                    {c.imageUrl && (
                      <div style={{marginTop: 8}}>
                        <img 
                          src={c.imageUrl} 
                          alt={c.title}
                          style={{maxWidth: '100%', maxHeight: '200px', borderRadius: '8px'}}
                        />
                      </div>
                    )}
                    
                    {/* Display video if available */}
                    {c.videoUrl && (
                      <div style={{marginTop: 8}}>
                        <div style={{fontWeight: 'bold', marginBottom: 4}}>Intro Video:</div>
                        <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                          Watch Video
                        </a>
                      </div>
                    )}
                    
                    {/* Show materials count */}
                    {c.materials && c.materials.length > 0 && (
                      <div style={{fontSize: 13, color: '#6b7280', marginTop: 4}}>
                        Materials: {c.materials.length}
                      </div>
                    )}
                    
                    <div style={{display: 'flex', gap: 8, marginTop: 12, alignItems: 'center'}}>
                      <Link className="btn" to={`/app/courses/${c._id}`}>View Details</Link>
                      
                      {!isCompleted && (
                        <button 
                          className="btn btn-success" 
                          onClick={() => markCourseCompleted(c._id)}
                        >
                          Mark as Completed
                        </button>
                      )}
                      
                      {courseProgress && (
                        <span>Progress: {courseProgress.progressPercent}%</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {/* END OF COURSES DISPLAY CODE */}
        
      </div>
    </div>
  </div>
)}

        {showProgress && (
          <div className="modal-overlay" onClick={()=>setShowProgress(false)}>
            <div className="modal" onClick={(e)=>e.stopPropagation()}>
              <header><h3>Your Progress</h3><button className="btn secondary" onClick={()=>setShowProgress(false)}>Close</button></header>
              <div className="modal-body">
                <table className="table">
                  <thead><tr><th>Course</th><th>Materials</th><th>Quizzes</th><th>Assignments</th><th>Games</th><th>%</th></tr></thead>
                  <tbody>
                    {progressList.map(p => (
                      <tr key={p._id}>
                        <td>{p.course?.title}</td>
                        <td>{p.materialsCompleted}</td>
                        <td>{p.quizzesCompleted}</td>
                        <td>{p.assignmentsSubmitted}</td>
                        <td>{p.gamesCompleted}</td>
                        <td>{p.progressPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

function TeacherOnboarding() {
  const [teacher, setTeacher] = useState(null)
  const [form, setForm] = useState({ qualification: '', contact: '', details: '' })
  const [resumeFile, setResumeFile] = useState(null)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    api.get('/teachers/me').then(r => {
      setTeacher(r.data.data || null)
      const d = r.data.data || {}
      setForm({ qualification: d.qualification || '', contact: d.contact || '', details: d.details || '' })
    })
  }, [])

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }) }

  async function saveProfile(e) {
    e.preventDefault()
    setMessage('')
    try {
      await api.post('/teachers/profile', form)
      if (resumeFile) {
        const fd = new FormData()
        fd.append('resume', resumeFile)
        await api.post('/teachers/resume', fd)
      }
      const r = await api.get('/teachers/me')
      setTeacher(r.data.data || null)
      setMessage('Profile submitted. Admin will review your resume.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      setResumeFile(null)
    } catch {
      setMessage('Failed to submit profile')
    }
  }

  return (
    <div className="layout grid">
      <aside className="sidebar">
        <div className="sidebar-brand">EcoLearn</div>
        <div className="sidebar-section">Teacher Onboarding</div>
        <div className="sidebar-link" style={{color: '#6b7280'}}>Complete your profile to access teacher features</div>
      </aside>
      <main className="content">
        <header className="page-header">
          <div className="page-title">Teacher Onboarding</div>
          <div className="page-subtitle">Complete your profile for admin review</div>
        </header>
        <div style={{maxWidth: 600, margin: '0 auto'}}>
          <p>Please provide your details and upload your PDF resume for admin review.</p>
          <form onSubmit={saveProfile} className="auth-form">
            <label>Qualification</label>
            <input name="qualification" value={form.qualification} onChange={handleChange} required />
            <label>Contact</label>
            <input name="contact" value={form.contact} onChange={handleChange} required />
            <label>Details</label>
            <input name="details" value={form.details} onChange={(e) => setForm({...form, details: e.target.value})} required />
            <label>Upload Resume (PDF)</label>
            <input type="file" accept="application/pdf" ref={fileInputRef} onChange={(e)=>setResumeFile(e.target.files?.[0]||null)} />
            <button type="submit">Submit for Review</button>
          </form>
          {message && <div style={{marginTop:8, padding:8, background:'#f0f9ff', border:'1px solid #0ea5e9', borderRadius:6}}>{message}</div>}
        </div>
      </main>
    </div>
  )
}