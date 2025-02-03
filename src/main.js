document.addEventListener('DOMContentLoaded', () => {
  const dbName = 'TarefasDB';
  const storeName = 'Tarefas';
  let db;
  let currentFilter = 'all';

  const openDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = (event) => {
        reject('Error opening database');
      };
    });
  };

  const addTask = (task) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(task);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error adding task');
    });
  };

  const getTasks = () => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error getting tasks');
    });
  };

  const renderTasks = (tasks) => {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    const filteredTasks = tasks.filter(task => {
      if (currentFilter === 'all') return true;
      return task.category === currentFilter;
    });

    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="task-info">
          <span class="task-title">${task.title}</span>
          <span class="task-date">${task.date} às ${task.time}</span>
          <span class="task-category">${task.category}</span>
          ${task.image ? `<img src="${task.image}" alt="Task Image" class="task-image">` : ''}
        </div>
        <div class="task-actions">
          <button onclick="window.deleteTask(${task.id})">Excluir</button>
        </div>
      `;
      taskList.appendChild(li);
    });
  };

  window.deleteTask = (id) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => loadTasks();
    request.onerror = () => console.error('Error deleting task');
  };

  const loadTasks = async () => {
    const tasks = await getTasks();
    renderTasks(tasks);
  };

  // Acessar a câmera e capturar imagem
  const video = document.getElementById('camera-preview');
  const canvas = document.getElementById('canvas');
  const captureButton = document.getElementById('capture-button');
  let capturedImage = null;

  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error('Erro ao acessar a câmera:', error);
    });

  captureButton.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedImage = canvas.toDataURL('image/png');
  });

  // Modificar a função de adicionar tarefa para incluir a imagem
  const taskForm = document.getElementById('task-form');
  taskForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = document.getElementById('task-title').value;
    const category = document.getElementById('task-category').value;
    const date = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;

    const task = { title, category, date, time, image: capturedImage };
    await addTask(task);
    loadTasks();
    taskForm.reset();
    capturedImage = null; // Resetar a imagem capturada

    const notificationDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    const timeUntilNotification = notificationDateTime - now;

    if (timeUntilNotification > 0) {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('Lembrete de Tarefa', {
            body: `Tarefa: ${title}`,
            icon: '/icons/icon-192x192.png'
          });
        }
      }, timeUntilNotification);
    }
  });

  document.getElementById('show-all').addEventListener('click', () => {
    currentFilter = 'all';
    loadTasks();
  });

  document.getElementById('show-work').addEventListener('click', () => {
    currentFilter = 'trabalho';
    loadTasks();
  });

  document.getElementById('show-study').addEventListener('click', () => {
    currentFilter = 'estudo';
    loadTasks();
  });

  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }

  openDB().then(() => loadTasks());
});