function addSubject() {
    const subjectContainer = document.getElementById('subjects');
    const newSubject = document.createElement('div');
    newSubject.className = 'subject';
    newSubject.innerHTML = `
        <input type="text" name="subject" placeholder="Subject Name" required>
        <input type="text" name="teacher" placeholder="Teacher Name" required>
        <input type="number" name="duration" placeholder="Duration (mins)" required min="30" max="180">
        <input type="number" name="frequency" placeholder="Frequency per week" required min="1" max="5">
        <input type="text" name="room" placeholder="Room Number" required>
        <button type="button" class="remove-btn" onclick="removeSubject(this)">Remove</button>
    `;
    subjectContainer.appendChild(newSubject);
}

function removeSubject(button) {
    button.parentElement.remove();
}

function addLab() {
    const labContainer = document.getElementById('labs');
    const newLab = document.createElement('div');
    newLab.className = 'lab';
    newLab.innerHTML = `
        <input type="text" name="lab" placeholder="Lab Name" required>
        <input type="text" name="labTeacher" placeholder="Lab Teacher" required>
        <input type="number" name="labDuration" placeholder="Duration (mins)" required min="30" max="180">
        <input type="text" name="labBatch" placeholder="Batch (A/B)" required>
        <input type="text" name="labRoom" placeholder="Room Number" required>
        <button type="button" class="remove-btn" onclick="removeLab(this)">Remove</button>
    `;
    labContainer.appendChild(newLab);
}

function removeLab(button) {
    button.parentElement.remove();
}

document.getElementById('timetable-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        subjects: [],
        teachers: [],
        durations: [],
        frequencies: [],
        rooms: [],
        labs: [],
        labTeachers: [],
        labDurations: [],
        labBatches: [],
        labRooms: []
    };

    formData.forEach((value, key) => {
        if (key === 'subject') data.subjects.push(value);
        if (key === 'teacher') data.teachers.push(value);
        if (key === 'duration') data.durations.push(value);
        if (key === 'frequency') data.frequencies.push(value);
        if (key === 'room') data.rooms.push(value);
        if (key === 'lab') data.labs.push(value);
        if (key === 'labTeacher') data.labTeachers.push(value);
        if (key === 'labDuration') data.labDurations.push(value);
        if (key === 'labBatch') data.labBatches.push(value);
        if (key === 'labRoom') data.labRooms.push(value);
    });

    fetch('/generate-timetable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        document.getElementById('timetable-output').innerHTML = `<a href="${result.pdfUrl}" target="_blank">Download Timetable PDF</a>`;
    })
    .catch(error => console.error('Error:', error));
});
