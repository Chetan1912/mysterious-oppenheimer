const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // Clear existing data (in order of dependency)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.marks.deleteMany();
  await prisma.test.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.dueRecord.deleteMany();
  await prisma.document.deleteMany();
  await prisma.student.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.feePlan.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing records.");

  // Hash password
  const passwordHash = await bcrypt.hash("admin123", 10);
  const teacherPasswordHash = await bcrypt.hash("teacher123", 10);
  const parentPasswordHash = await bcrypt.hash("parent123", 10);

  // 1. Create Users
  const ownerUser = await prisma.user.create({
    data: {
      email: "owner@apex.com",
      passwordHash,
      name: "Aditya Sharma",
      role: "OWNER",
      phone: "+919876543210",
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: "teacher@apex.com",
      passwordHash: teacherPasswordHash,
      name: "Vikram Malhotra",
      role: "TEACHER",
      phone: "+919876543211",
    },
  });

  const parentUser = await prisma.user.create({
    data: {
      email: "parent@apex.com",
      passwordHash: parentPasswordHash,
      name: "Rajesh Gupta",
      role: "PARENT",
      phone: "+919876543212",
    },
  });

  console.log("Users created.");

  // 2. Create Teacher and Parent profiles
  const teacher = await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
    },
  });

  const parent = await prisma.parent.create({
    data: {
      userId: parentUser.id,
    },
  });

  console.log("Teacher and Parent profiles created.");

  // 3. Create Fee Plan
  const feePlan = await prisma.feePlan.create({
    data: {
      name: "Standard Monthly Plan",
      amount: 10000.00,
      dueDateDay: 5,
      lateFeeRule: 500.00,
    },
  });

  console.log("Fee plan created.");

  // 4. Create Batch
  const batch = await prisma.batch.create({
    data: {
      name: "Grade 10 - Mathematics",
      description: "Daily math classes covering Algebra, Geometry, and Trigonometry.",
      teacherId: teacher.id,
    },
  });

  console.log("Batch created.");

  // 5. Create Student
  const student = await prisma.student.create({
    data: {
      admissionId: "APEX-2026-001",
      name: "Aarav Gupta",
      parentId: parent.id,
      batchId: batch.id,
      feePlanId: feePlan.id,
      joiningDate: new Date("2026-01-05"),
      address: "102, Shanti Kunj, Sector 4, Dwarka, New Delhi",
      notes: "Attentive student. Prefers visual explanations. Solid base in arithmetic.",
    },
  });

  console.log("Student created.");

  // 6. Create Due Records & Payments
  // May 2026 (Paid)
  const dueMay = await prisma.dueRecord.create({
    data: {
      studentId: student.id,
      month: 5,
      year: 2026,
      baseAmount: 10000.00,
      lateFee: 0.00,
      totalDue: 10000.00,
      paidAmount: 10000.00,
      status: "PAID",
    },
  });

  await prisma.payment.create({
    data: {
      dueRecordId: dueMay.id,
      studentId: student.id,
      amountPaid: 10000.00,
      paymentDate: new Date("2026-05-04"),
      paymentMethod: "UPI",
      notes: "Full payment received via GPay.",
    },
  });

  // June 2026 (Partial Payment - Late)
  const dueJune = await prisma.dueRecord.create({
    data: {
      studentId: student.id,
      month: 6,
      year: 2026,
      baseAmount: 10000.00,
      lateFee: 500.00, // Late fee applied
      totalDue: 10500.00,
      paidAmount: 6000.00,
      status: "PARTIAL",
      lastReminder: new Date("2026-06-25"),
      reminderCount: 2,
    },
  });

  await prisma.payment.create({
    data: {
      dueRecordId: dueJune.id,
      studentId: student.id,
      amountPaid: 6000.00,
      paymentDate: new Date("2026-06-10"),
      paymentMethod: "Bank Transfer",
      notes: "Partial payment of ₹6,000 received. Balance pending.",
    },
  });

  console.log("Fee due records and payments created.");

  // 7. Create Test & Marks
  const test = await prisma.test.create({
    data: {
      title: "Algebra & Polynomials Test",
      maxMarks: 50,
      testDate: new Date("2026-06-15T10:00:00Z"),
      batchId: batch.id,
    },
  });

  await prisma.marks.create({
    data: {
      testId: test.id,
      studentId: student.id,
      score: 42.00,
      remarks: "Excellent logical reasoning. Made a minor calculation error in Q4.",
    },
  });

  console.log("Test and marks created.");

  // 8. Create Schedules
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(16, 0, 0, 0); // 4 PM

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(17, 30, 0, 0); // 5:30 PM

  await prisma.schedule.create({
    data: {
      batchId: batch.id,
      teacherId: teacher.id,
      startTime: tomorrow,
      endTime: tomorrowEnd,
      notes: "Topics: Solving quadratic equations. Please bring your textbook.",
    },
  });

  console.log("Schedule created.");

  // 9. Create Notices
  await prisma.notice.create({
    data: {
      title: "Mid-Term Exam Schedule Announced",
      content: "Dear Parents, the mid-term exams for all batches will commence from July 15th, 2026. The detailed syllabus and timetable will be shared by the respective teachers next week.",
      targetRoles: ["PARENT", "TEACHER"],
    },
  });

  await prisma.notice.create({
    data: {
      title: "Summer Holiday Notice",
      content: "The institute will remain closed on July 1st, 2026, for the start of the summer break. Regular classes will resume from July 2nd.",
      targetRoles: ["PARENT", "TEACHER"],
    },
  });

  console.log("Notices created.");

  // 10. Create initial Notifications
  await prisma.notification.create({
    data: {
      userId: parentUser.id,
      title: "New Test Report Published",
      message: "Algebra & Polynomials Test marks have been published. Aarav scored 42/50.",
    },
  });

  await prisma.notification.create({
    data: {
      userId: parentUser.id,
      title: "Fee Payment Reminder",
      message: "Friendly reminder: Fee for June 2026 is pending. Balance: ₹4,500.",
    },
  });

  console.log("Notifications created.");
  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
