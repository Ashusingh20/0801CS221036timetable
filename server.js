const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/generate-timetable', (req, res) => {
    const { subjects, teachers, durations, frequencies, rooms, labs, labTeachers, labDurations, labBatches, labRooms } = req.body;

    try {
        const timetableA = generateTimetable(subjects, teachers, durations, rooms, frequencies, labs, labTeachers, labDurations, labBatches, labRooms, 'A');
        const timetableB = generateTimetable(subjects, teachers, durations, rooms, frequencies, labs, labTeachers, labDurations, labBatches, labRooms, 'B', timetableA);

        const pdfFilename = 'timetable.pdf';
        const pdfPath = path.join(__dirname, 'public', pdfFilename);
        const doc = new PDFDocument({ margin: 30 });
        doc.pipe(fs.createWriteStream(pdfPath));

        // Timetable for Section A
        doc.fontSize(18).text('Weekly Timetable', { align: 'center' }).moveDown(1);
        doc.fontSize(14).text('Section A Timetable', { align: 'left' }).moveDown(0.5);
        drawTimetable(doc, timetableA);

        // Timetable for Section B
        doc.addPage();
        doc.fontSize(14).text('Section B Timetable', { align: 'left' }).moveDown(0.5);
        drawTimetable(doc, timetableB);

        doc.end();

        res.status(200).json({ pdfUrl: `/${pdfFilename}` });
    } catch (error) {
        console.error('Error generating timetable:', error);
        res.status(500).json({ error: 'Error generating timetable' });
    }
});

function drawTimetable(doc, timetable) {
    // Include lunch break from 1:00 PM to 2:00 PM
    const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 'Lunch Break', '2:00 PM', '3:00 PM', '4:00 PM'];
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const startX = 30;
    const startY = doc.y + 10;
    const colWidth = (doc.page.width - 2 * startX) / (daysOfWeek.length + 1);

    const header = ['Time'].concat(daysOfWeek);
    drawTableRow(doc, header, startX, startY, colWidth, 20, true);

    let currentY = startY + 20;
    timeSlots.forEach((time, timeIndex) => {
        const row = [time];
        daysOfWeek.forEach((day) => {
            if (time === 'Lunch Break') {
                row.push(''); // Empty cell for lunch break
            } else {
                const entry = timetable.find(
                    (entry) => entry.day === day && entry.timeIndex === timeIndex
                );
                row.push(entry ? `${entry.subject}\n${entry.teacher}\nRoom: ${entry.room}` : '');
            }
        });
        drawTableRow(doc, row, startX, currentY, colWidth, 60);
        currentY += 60;
    });
}

function drawTableRow(doc, row, startX, startY, colWidth, rowHeight, isHeader = false) {
    const cellMargin = 5;
    row.forEach((cellText, index) => {
        const x = startX + index * colWidth;
        const y = startY;
        doc.rect(x, y, colWidth, rowHeight).stroke();
        doc.fontSize(isHeader ? 12 : 10)
            .text(cellText, x + cellMargin, y + cellMargin, { width: colWidth - 2 * cellMargin, align: 'center' });
    });
}

function generateTimetable(subjects, teachers, durations, rooms, frequencies, labs, labTeachers, labDurations, labBatches, labRooms, section, otherTimetable = []) {
    const timetable = [];
    const daySchedule = {
        Mon: Array(8).fill(null),
        Tue: Array(8).fill(null),
        Wed: Array(8).fill(null),
        Thu: Array(8).fill(null),
        Fri: Array(8).fill(null),
    };

    const days = Object.keys(daySchedule);
    let dayIndex = 0;

    // Schedule subjects first
    subjects.forEach((subject, index) => {
        const teacher = teachers[index];
        const duration = Math.ceil(durations[index] / 60);
        const frequency = frequencies[index];
        const room = rooms[index];

        let scheduledTimes = 0;

        for (let i = 0; i < days.length && scheduledTimes < frequency; i++) {
            const day = days[(dayIndex + i) % days.length];
            for (let j = 0; j < daySchedule[day].length - duration + 1; j++) {
                if (j === 4) continue; // Skip scheduling during the lunch break (1:00 PM - 2:00 PM)

                let canSchedule = true;

                for (let k = 0; k < duration; k++) {
                    // Check if the time slot is already taken or if there's a conflict with the other timetable
                    if (
                        daySchedule[day][j + k] ||
                        otherTimetable.find(
                            (entry) => entry.day === day && entry.timeIndex === j + k && (entry.teacher === teacher || entry.room === room || entry.subject === subject)
                        )
                    ) {
                        canSchedule = false;
                        break;
                    }
                }

                if (canSchedule) {
                    for (let k = 0; k < duration; k++) {
                        daySchedule[day][j + k] = { subject, teacher, room, timeIndex: j };
                    }
                    timetable.push({ day, subject, teacher, room, timeIndex: j });
                    scheduledTimes++;
                    break;
                }
            }
        }

        dayIndex = (dayIndex + 1) % days.length;
    });

    // Schedule labs for the respective section
    labs.forEach((lab, index) => {
        const labTeacher = labTeachers[index];
        const labDuration = Math.ceil(labDurations[index] / 60);
        const batch = labBatches[index].toUpperCase(); // Normalize to uppercase
        const room = labRooms[index];

        // Schedule labs only for the respective section
        if ((batch.startsWith('A') && section === 'A') || (batch.startsWith('B') && section === 'B')) {
            let scheduled = false;
            for (let i = 0; i < days.length && !scheduled; i++) {
                const day = days[(dayIndex + i) % days.length];
                for (let j = 0; j < daySchedule[day].length - labDuration + 1; j++) {
                    if (j === 4) continue; // Skip scheduling during the lunch break (1:00 PM - 2:00 PM)

                    let canSchedule = true;

                    for (let k = 0; k < labDuration; k++) {
                        if (
                            daySchedule[day][j + k] ||
                            otherTimetable.find(
                                (entry) => entry.day === day && entry.timeIndex === j + k && (entry.teacher === labTeacher || entry.room === room)
                            )
                        ) {
                            canSchedule = false;
                            break;
                        }
                    }

                    if (canSchedule) {
                        for (let k = 0; k < labDuration; k++) {
                            daySchedule[day][j + k] = { subject: lab, teacher: labTeacher, room, timeIndex: j };
                        }
                        timetable.push({ day, subject: lab, teacher: labTeacher, room, timeIndex: j });
                        scheduled = true;
                        break;
                    }
                }
            }
        }
    });

    return timetable;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
