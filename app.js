// Student Progress Tracker App
class StudentTracker {
    constructor() {
        this.students = [];
        this.fieldTrips = {};
        this.currentStudent = null;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            // Load student enrollment data
            const studentsResponse = await fetch('students_by_grade.json');
            const studentsByGrade = await studentsResponse.json();
            
            // Flatten students with grade info
            this.students = [];
            for (const [grade, names] of Object.entries(studentsByGrade)) {
                names.forEach(name => {
                    this.students.push({
                        name: name,
                        grade: grade
                    });
                });
            }

            // Load field trip data
            const tripsResponse = await fetch('field_trips_data.json');
            this.fieldTrips = await tripsResponse.json();

        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Make sure the JSON files are in the same directory.');
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('studentSearch');
        const suggestions = document.getElementById('suggestions');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                suggestions.style.display = 'none';
                return;
            }

            this.showSuggestions(query);
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                suggestions.style.display = 'none';
            }, 200);
        });

        searchInput.addEventListener('focus', (e) => {
            if (e.target.value.length >= 2) {
                this.showSuggestions(e.target.value);
            }
        });
    }

    showSuggestions(query) {
        const suggestions = document.getElementById('suggestions');
        const matches = this.students.filter(student => 
            student.name.toLowerCase().includes(query.toLowerCase())
        );

        if (matches.length === 0) {
            suggestions.style.display = 'none';
            return;
        }

        suggestions.innerHTML = matches.map(student => `
            <div class="suggestion-item" onclick="tracker.selectStudent('${student.name}')">
                ${student.name}
                <span class="grade-badge">Grade ${student.grade}</span>
            </div>
        `).join('');

        suggestions.style.display = 'block';
    }

    selectStudent(studentName) {
        const student = this.students.find(s => s.name === studentName);
        if (student) {
            this.currentStudent = student;
            document.getElementById('studentSearch').value = studentName;
            document.getElementById('suggestions').style.display = 'none';
            this.displayStudentProgress();
        }
    }

    // Helper function to normalize names for comparison
    normalizeName(name) {
        // Remove year indicators like '27, '26, etc.
        let normalized = name.replace(/\s*'[0-9]{2}\s*$/, '').trim();
        
        // Convert "Last, First" to "First Last" or vice versa for comparison
        // We'll create multiple variations to check
        return normalized.toLowerCase();
    }

    // Check if two names match (handles different formats)
    namesMatch(name1, name2) {
        const n1 = this.normalizeName(name1);
        const n2 = this.normalizeName(name2);
        
        // Direct match
        if (n1 === n2) return true;
        
        // Extract first and last names for both
        let parts1, parts2;
        
        if (name1.includes(',')) {
            // Format: "Last, First"
            parts1 = name1.split(',').map(p => p.trim().replace(/\s*'[0-9]{2}\s*$/, '').trim());
            parts1 = [parts1[1], parts1[0]]; // [First, Last]
        } else {
            // Format: "First Last"
            parts1 = name1.split(' ').map(p => p.trim());
        }
        
        if (name2.includes(',')) {
            parts2 = name2.split(',').map(p => p.trim().replace(/\s*'[0-9]{2}\s*$/, '').trim());
            parts2 = [parts2[1], parts2[0]];
        } else {
            parts2 = name2.split(' ').map(p => p.trim());
        }
        
        // Compare first and last names (case insensitive)
        if (parts1.length >= 2 && parts2.length >= 2) {
            const firstName1 = parts1[0].toLowerCase();
            const lastName1 = parts1[parts1.length - 1].toLowerCase();
            const firstName2 = parts2[0].toLowerCase();
            const lastName2 = parts2[parts2.length - 1].toLowerCase();
            
            return firstName1 === firstName2 && lastName1 === lastName2;
        }
        
        return false;
    }

    displayStudentProgress() {
        const results = document.getElementById('results');
        
        if (!this.currentStudent) {
            results.innerHTML = `
                <div class="empty-state">
                    <h3>Student not found</h3>
                    <p>Please try another search</p>
                </div>
            `;
            return;
        }

        // Find all field trips this student attended using flexible name matching
        const attendedTrips = [];
        for (const [tripName, tripData] of Object.entries(this.fieldTrips)) {
            const attended = tripData.students.some(studentName => 
                this.namesMatch(this.currentStudent.name, studentName)
            );
            if (attended) {
                attendedTrips.push(tripData);
            }
        }

        // Get all available trips
        const allTrips = Object.values(this.fieldTrips);
        const completedCount = attendedTrips.length;
        const totalCount = allTrips.length;

        results.innerHTML = `
            <div class="student-info">
                <h2>${this.currentStudent.name}</h2>
                <p class="grade">Grade ${this.currentStudent.grade}</p>
            </div>

            <div class="summary">
                <div class="summary-item">
                    <div class="summary-number">${completedCount}</div>
                    <div class="summary-label">Completed</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${totalCount - completedCount}</div>
                    <div class="summary-label">Remaining</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${Math.round((completedCount / totalCount) * 100)}%</div>
                    <div class="summary-label">Progress</div>
                </div>
            </div>

            <div class="progress-card">
                <h3>Field Trips Progress</h3>
                <div class="trip-list">
                    ${allTrips.map(trip => {
                        const completed = trip.students.some(studentName => 
                            this.namesMatch(this.currentStudent.name, studentName)
                        );
                        return `
                            <div class="trip-item">
                                <div class="trip-info">
                                    <div class="trip-name">${trip.name}</div>
                                    <div class="trip-date">${trip.date} • ${trip.teacher}</div>
                                </div>
                                <span class="status-badge ${completed ? 'status-complete' : 'status-incomplete'}">
                                    ${completed ? '✓ Attended' : '✗ Not Attended'}
                                </span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    showError(message) {
        const results = document.getElementById('results');
        results.innerHTML = `
            <div class="empty-state">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the tracker
const tracker = new StudentTracker();
