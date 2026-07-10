import Enrollment from '../models/Enrollment.js';
import TaskSubmission from '../models/TaskSubmission.js';
import Internship from '../models/Internship.js';
import { isValidLinkedInUrl, successResponse, errorResponse } from '../utils/helpers.js';

const durationKey = (months) => `${months}m`;

const getOwnedEnrollment = async (enrollmentId, userId) => {
  return Enrollment.findOne({ _id: enrollmentId, user_id: userId });
};

const deriveTaskStatus = (taskNumber, currentTask, submissions) => {
  const submission = submissions.find((s) => s.task_number === taskNumber);

  if (submission && submission.status === 'approved') return 'completed';
  if (submission && submission.status === 'rejected' && taskNumber === currentTask) return 'rejected';
  if (submission && submission.status === 'pending' && taskNumber === currentTask) return 'pending';
  if (taskNumber === currentTask && !submission) return 'current';
  if (taskNumber > currentTask) return 'locked';
  // Fallback: any task before current_task with no clean match is treated as completed
  return 'completed';
};

export const getAllTasks = async (req, res) => {
  try {
    const enrollment = await getOwnedEnrollment(req.params.enrollmentId, req.user.id);
    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));

    const internship = await Internship.findById(enrollment.internship_id);
    const syllabus = internship.syllabus[durationKey(enrollment.duration_months)] || [];
    const submissions = await TaskSubmission.find({ enrollment_id: enrollment._id });

    const tasks = [];
    for (let taskNumber = 1; taskNumber <= enrollment.total_tasks; taskNumber += 1) {
      const syllabusTask = syllabus.find((t) => t.task_number === taskNumber) || {};
      const submission = submissions.find((s) => s.task_number === taskNumber);
      tasks.push({
        task_number: taskNumber,
        title: syllabusTask.title,
        description: syllabusTask.description,
        instructions: syllabusTask.instructions,
        resources: syllabusTask.resources,
        deadline_days: syllabusTask.deadline_days,
        status: deriveTaskStatus(taskNumber, enrollment.current_task, submissions),
        submission: submission || null
      });
    }

    return res.json(successResponse({ data: tasks }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getCurrentTask = async (req, res) => {
  try {
    const enrollment = await getOwnedEnrollment(req.params.enrollmentId, req.user.id);
    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));

    const internship = await Internship.findById(enrollment.internship_id);
    const syllabus = internship.syllabus[durationKey(enrollment.duration_months)] || [];
    const currentTask = syllabus.find((t) => t.task_number === enrollment.current_task);

    if (!currentTask) return res.status(404).json(errorResponse('Current task not found in syllabus'));

    return res.json(successResponse({ data: { ...currentTask.toObject?.() ?? currentTask, task_number: enrollment.current_task } }));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const submitTask = async (req, res) => {
  try {
    const { linkedin_url } = req.body;
    const enrollment = await getOwnedEnrollment(req.params.enrollmentId, req.user.id);
    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));
    if (enrollment.status !== 'active') {
      return res.status(400).json(errorResponse('This enrollment is not active'));
    }
    if (!isValidLinkedInUrl(linkedin_url)) {
      return res.status(400).json(errorResponse('Please provide a valid LinkedIn post URL'));
    }

    const existing = await TaskSubmission.findOne({
      enrollment_id: enrollment._id,
      task_number: enrollment.current_task
    });

    if (existing && existing.status === 'pending') {
      return res.status(400).json(errorResponse('This task is already submitted and awaiting review'));
    }

    if (existing && existing.status === 'rejected') {
      existing.linkedin_url = linkedin_url;
      existing.status = 'pending';
      existing.review_notes = undefined;
      existing.reviewed_by = undefined;
      existing.reviewed_at = undefined;
      existing.submitted_at = new Date();
      await existing.save();
      return res.json(successResponse({}, 'Task resubmitted successfully'));
    }

    await TaskSubmission.create({
      enrollment_id: enrollment._id,
      task_number: enrollment.current_task,
      linkedin_url
    });

    return res.json(successResponse({}, 'Task submitted successfully'));
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

export const getProgress = async (req, res) => {
  try {
    const enrollment = await getOwnedEnrollment(req.params.enrollmentId, req.user.id);
    if (!enrollment) return res.status(404).json(errorResponse('Enrollment not found'));

    const completed = await TaskSubmission.countDocuments({
      enrollment_id: enrollment._id,
      status: 'approved'
    });
    const total = enrollment.total_tasks;
    const percentage = Math.round((completed / total) * 100);

    return res.json(
      successResponse({ data: { completed, total, percentage, current_task: enrollment.current_task } })
    );
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};
