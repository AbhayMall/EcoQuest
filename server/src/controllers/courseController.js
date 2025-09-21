const Joi = require('joi');
const Course = require('../models/Course');
const User = require('../models/User');
const Progress = require('../models/Progress');

// Schema for validating course creation data
const createSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow(''),
  imageUrl: Joi.string().uri().allow('', null),
  videoUrl: Joi.string().uri().allow('', null),
});

/**
 * Creates a new course. The course is set to unapproved by default.
 */
// ... existing code ...

async function createCourse(req, res) {
  try {
    const { value, error } = createSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }
    
    // Get teacher's email
    const teacher = await User.findById(req.user.id);
    if (!teacher) {
      return res.status(404).json({ error: { message: 'Teacher not found' } });
    }
    
    const course = await Course.create({ 
      ...value, 
      teacher: req.user.id, 
      teacherEmail: teacher.email, // Store teacher email
      isApproved: false 
    });
    
    res.status(201).json({ data: course });
  } catch (err) {
    console.error("Error in createCourse:", err);
    res.status(500).json({ error: { message: 'Failed to create course' } });
  }
}

// ... existing code ...

/**
 * Lists courses based on the user's role.
 * Admins see all courses.
 * Students see approved courses from their selected teachers.
 */
async function listCourses(req, res) {
  try {
    const user = await User.findById(req.user.id);
    let filter = {};

    if (user.role === 'admin') {
      // No filter for admin, they see all courses
    } else if (user.role === 'student') {
      filter.isApproved = true;
      if (user.selectedTeachers && user.selectedTeachers.length > 0) {
        filter.teacher = { $in: user.selectedTeachers };
      } else {
        // Return an empty array if the student has not selected any teachers
        return res.json({ data: [] });
      }
    } else {
      // Default behavior for other roles or unauthenticated (if middleware allows)
      filter.isApproved = true;
    }

    const courses = await Course.find(filter)
      .populate('teacher', 'name email')
      .populate('quizzes')
      .populate('assignments');
    res.json({ data: courses });
  } catch (err) {
    console.error("Error in listCourses:", err);
    res.status(500).json({ error: { message: 'Failed to list courses' } });
  }
}

/**
 * Gets a single course by its ID.
 */
async function getCourse(req, res) {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacher', 'name')
      .populate('quizzes')
      .populate('assignments')
      .populate('students', 'name email');
    if (!course) {
      return res.status(404).json({ error: { message: 'Course not found' } });
    }
    res.json({ data: course });
  } catch (err) {
    console.error("Error in getCourse:", err);
    res.status(500).json({ error: { message: 'Failed to get course' } });
  }
}

/**
 * Lists all courses created by the currently logged-in teacher.
 */
async function listMyCourses(req, res) {
  try {
    const courses = await Course.find({ teacher: req.user.id })
      .populate('students', 'name email ecoPoints')
      .sort({ createdAt: -1 });
    res.json({ data: courses });
  } catch (err) {
    console.error("Error in listMyCourses:", err);
    res.status(500).json({ error: { message: 'Failed to list teacher courses' } });
  }
}

/**
 * Enrolls the current user in a course.
 */
async function enrollInCourse(req, res) {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ error: { message: 'Course not found' } });
    }

    if (course.students.includes(userId)) {
      return res.json({ data: { enrolled: true, message: 'Already enrolled' } });
    }

    course.students.push(userId);
    await course.save();

    await User.findByIdAndUpdate(userId, { $addToSet: { enrolledCourses: courseId } });

    // Create a progress document for the student for this course
    await Progress.findOneAndUpdate(
      { student: userId, course: courseId },
      { $setOnInsert: { materialsCompleted: 0, quizzesCompleted: 0, assignmentsSubmitted: 0, gamesCompleted: 0, progressPercent: 0 } },
      { upsert: true, new: true }
    );

    res.json({ data: { enrolled: true } });
  } catch (err) {
    console.error("Error in enrollInCourse:", err);
    res.status(500).json({ error: { message: 'Failed to enroll' } });
  }
}

/**
 * Adds a new material to a course.
 * Note: This function assumes the file has already been uploaded and expects file metadata.
 */
async function addMaterial(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'File upload is required.' } });
    }

    const { type, title, description } = req.body;
    const { id: fileId, filename, contentType } = req.file;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: { message: 'Course not found' } });
    }
    
    // Authorization check: Only the teacher of the course can add materials
    if (String(course.teacher) !== req.user.id) {
      return res.status(403).json({ error: { message: 'You are not authorized to modify this course' } });
    }

    course.materials.push({ type, title, description, fileId, filename, contentType });
    await course.save();

    res.status(201).json({ data: course.materials[course.materials.length - 1] });
  } catch (err) {
    console.error("Error in addMaterial:", err);
    res.status(500).json({ error: { message: 'Failed to add material' } });
  }
}


module.exports = { 
  createCourse, 
  listCourses, 
  getCourse, 
  enrollInCourse, 
  addMaterial, 
  listMyCourses 
};