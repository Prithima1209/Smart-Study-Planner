        let tasks = [];
        let currentFilter = 'all';
        let reminderInterval = null;

        // Load tasks from local storage
        function loadTasks() {
            const saved = localStorage.getItem('studyPlannerTasks');
            if (saved) {
                tasks = JSON.parse(saved);
            }
        }

        // Save tasks to local storage
        function saveTasks() {
            localStorage.setItem('studyPlannerTasks', JSON.stringify(tasks));
        }

        // Initialize
        function init() {
            loadTasks();
            renderTasks();
            updateStats();
            renderTimeline();
            setMinDateTime();
            startReminderCheck();

            // Event listeners
            document.getElementById('taskForm').addEventListener('submit', addTask);
            
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentFilter = this.dataset.filter;
                    renderTasks();
                });
            });
        }

        // Set minimum date-time to current time
        function setMinDateTime() {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            document.getElementById('taskDueDate').min = now.toISOString().slice(0, 16);
        }

        // Add new task
        function addTask(e) {
            e.preventDefault();
            
            const task = {
                id: Date.now(),
                title: document.getElementById('taskTitle').value,
                description: document.getElementById('taskDesc').value,
                subject: document.getElementById('taskSubject').value,
                dueDate: document.getElementById('taskDueDate').value,
                priority: document.getElementById('taskPriority').value,
                duration: document.getElementById('taskDuration').value,
                completed: false,
                createdAt: new Date().toISOString()
            };

            tasks.push(task);
            saveTasks();
            renderTasks();
            updateStats();
            renderTimeline();
            
            document.getElementById('taskForm').reset();
            setMinDateTime();
            
            showToast('✅ Task added successfully!');
        }

        // Toggle task completion
        function toggleTask(id) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveTasks();
                renderTasks();
                updateStats();
                renderTimeline();
                
                if (task.completed) {
                    showToast('🎉 Great job! Task completed!');
                }
            }
        }

        // Delete task
        function deleteTask(id) {
            if (confirm('Are you sure you want to delete this task?')) {
                tasks = tasks.filter(t => t.id !== id);
                saveTasks();
                renderTasks();
                updateStats();
                renderTimeline();
                showToast('🗑️ Task deleted successfully!');
            }
        }

        // Check if task is overdue
        function isOverdue(task) {
            return !task.completed && new Date(task.dueDate) < new Date();
        }

        // Filter tasks
        function filterTasks() {
            switch(currentFilter) {
                case 'pending':
                    return tasks.filter(t => !t.completed && !isOverdue(t));
                case 'completed':
                    return tasks.filter(t => t.completed);
                case 'overdue':
                    return tasks.filter(t => isOverdue(t));
                default:
                    return tasks;
            }
        }

        // Render tasks
        function renderTasks() {
            const taskList = document.getElementById('taskList');
            const filtered = filterTasks();
            
            if (filtered.length === 0) {
                taskList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <p>No tasks found in this category.</p>
                    </div>
                `;
                return;
            }

            // Sort by due date
            filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            taskList.innerHTML = filtered.map(task => {
                const dueDate = new Date(task.dueDate);
                const overdue = isOverdue(task);
                const taskClass = task.completed ? 'completed' : (overdue ? 'overdue' : '');
                
                return `
                    <div class="task-item ${taskClass}">
                        <div class="task-header">
                            <div class="task-title">${task.title}</div>
                            <span class="task-priority priority-${task.priority}">
                                ${task.priority.toUpperCase()}
                            </span>
                        </div>
                        ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                        <div class="task-meta">
                            ${task.subject ? `<span>📚 ${task.subject}</span>` : ''}
                            <span>📅 ${dueDate.toLocaleDateString()}</span>
                            <span>⏰ ${dueDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                            <span>⏱️ ${task.duration} min</span>
                        </div>
                        <div class="task-actions">
                            ${!task.completed ? `
                                <button class="btn-small btn-complete" onclick="toggleTask(${task.id})">
                                    ✓ Complete
                                </button>
                            ` : `
                                <button class="btn-small btn-complete" onclick="toggleTask(${task.id})">
                                    ↶ Undo
                                </button>
                            `}
                            <button class="btn-small btn-delete" onclick="deleteTask(${task.id})">
                                ✕ Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Update statistics
        function updateStats() {
            const total = tasks.length;
            const completed = tasks.filter(t => t.completed).length;
            const pending = tasks.filter(t => !t.completed).length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            document.getElementById('totalTasks').textContent = total;
            document.getElementById('completedTasks').textContent = completed;
            document.getElementById('pendingTasks').textContent = pending;
            
            const progressBar = document.getElementById('progressBar');
            progressBar.style.width = progress + '%';
            progressBar.textContent = progress + '%';
        }

        // Render timeline
        function renderTimeline() {
            const timeline = document.getElementById('timeline');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayTasks = tasks.filter(task => {
                const taskDate = new Date(task.dueDate);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === today.getTime() && !task.completed;
            });

            if (todayTasks.length === 0) {
                timeline.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">⏰</div>
                        <p>No tasks scheduled for today.</p>
                    </div>
                `;
                return;
            }

            todayTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            timeline.innerHTML = todayTasks.map(task => {
                const time = new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                return `
                    <div class="timeline-item">
                        <div class="timeline-time">${time}</div>
                        <div class="timeline-task">
                            <strong>${task.title}</strong>
                            ${task.subject ? `<br><small>📚 ${task.subject}</small>` : ''}
                            <br><small>⏱️ ${task.duration} minutes</small>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Play buzzer sound
        function playBuzzer() {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        }

        // Check for reminders
        function checkReminders() {
            const now = new Date();
            
            tasks.forEach(task => {
                if (!task.completed && !task.reminded) {
                    const dueDate = new Date(task.dueDate);
                    const timeDiff = dueDate - now;
                    
                    // Remind 5 minutes before
                    if (timeDiff > 0 && timeDiff <= 300000 && timeDiff > 240000) {
                        showReminder(task);
                        task.reminded = true;
                        saveTasks();
                    }
                    
                    // Task overdue - play buzzer
                    if (timeDiff < 0 && timeDiff > -60000 && !task.buzzerPlayed) {
                        playBuzzer();
                        showReminder(task, true);
                        task.buzzerPlayed = true;
                        saveTasks();
                    }
                }
            });
        }

        // Show reminder toast
        function showReminder(task, overdue = false) {
            const toast = document.createElement('div');
            toast.className = 'reminder-toast';
            toast.innerHTML = `
                <div class="reminder-header">${overdue ? '⚠️ TASK OVERDUE!' : '⏰ Reminder'}</div>
                <div><strong>${task.title}</strong></div>
                <div style="margin-top: 5px; color: #666;">
                    ${overdue ? 'This task is now overdue!' : 'Due in 5 minutes'}
                </div>
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 5000);
        }

        // Show toast notification
        function showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'reminder-toast';
            toast.innerHTML = `<div style="color: #667eea; font-weight: 600;">${message}</div>`;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        // Start reminder checking
        function startReminderCheck() {
            checkReminders();
            reminderInterval = setInterval(checkReminders, 30000); // Check every 30 seconds
        }

        // Initialize app
        init();
