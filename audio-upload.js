// Audio Upload Handler for Teaching Materials
class AudioUploader {
    constructor() {
        this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        this.ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac'];
        this.ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
        
        this.currentFile = null;
        this.init();
    }

    init() {
        // DOM Elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.uploadForm = document.getElementById('uploadForm');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.successMessage = document.getElementById('successMessage');
        this.errorMessage = document.getElementById('errorMessage');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.cancelBtn = document.getElementById('cancelBtn');

        this.bindEvents();
    }

    bindEvents() {
        // Click to upload
        this.uploadArea.addEventListener('click', () => this.fileInput.click());

        // File input change
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Form submission
        this.uploadForm.addEventListener('submit', (e) => this.handleSubmit(e));

        // Cancel button
        this.cancelBtn.addEventListener('click', () => this.resetForm());
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.validateAndProcessFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.validateAndProcessFile(files[0]);
        }
    }

    validateAndProcessFile(file) {
        // Check file type
        const isValidType = this.ALLOWED_TYPES.some(type => 
            file.type === type || file.type.startsWith('audio/')
        );

        // Check file extension
        const fileName = file.name.toLowerCase();
        const hasValidExtension = this.ALLOWED_EXTENSIONS.some(ext => 
            fileName.endsWith(ext)
        );

        if (!isValidType && !hasValidExtension) {
            this.showError('Format fail tidak disokong. Sila muat naik fail audio (MP3, WAV, OGG, dll).');
            return;
        }

        // Check file size
        if (file.size > this.MAX_FILE_SIZE) {
            this.showError('Saiz fail terlalu besar! Maksimum 50MB sahaja.');
            return;
        }

        // Process valid file
        this.currentFile = file;
        this.displayFileInfo(file);
        this.showForm();
    }

    displayFileInfo(file) {
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        
        // Create preview URL
        const fileURL = URL.createObjectURL(file);
        this.audioPlayer.src = fileURL;
        
        // Show file info section
        this.fileInfo.classList.add('active');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showForm() {
        this.uploadForm.style.display = 'block';
        this.uploadForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideForm() {
        this.uploadForm.style.display = 'none';
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.currentFile) {
            this.showError('Sila pilih fail audio terlebih dahulu.');
            return;
        }

        // Get form data
        const formData = new FormData();
        formData.append('audio', this.currentFile);
        formData.append('title', document.getElementById('title').value.trim());
        formData.append('subject', document.getElementById('subject').value.trim());
        formData.append('grade', document.getElementById('grade').value);
        formData.append('description', document.getElementById('description').value.trim());
        formData.append('uploadDate', new Date().toISOString());

        // Validate required fields
        const title = document.getElementById('title').value.trim();
        if (!title) {
            this.showError('Sila masukkan tajuk bahan pengajaran.');
            return;
        }

        // Show progress
        this.showProgress();
        this.hideMessages();
        this.uploadBtn.disabled = true;

        try {
            // Simulate upload progress (replace with actual API call)
            await this.simulateUpload(formData);
            
            // Success
            this.showSuccess();
            this.resetForm();
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Gagal memuat naik fail. Sila cuba lagi.');
        } finally {
            this.uploadBtn.disabled = false;
            this.hideProgress();
        }
    }

    simulateUpload(formData) {
        return new Promise((resolve, reject) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    
                    // Here you would make an actual API call
                    // Example:
                    // fetch('/api/upload', {
                    //     method: 'POST',
                    //     body: formData
                    // })
                    // .then(response => response.json())
                    // .then(data => resolve(data))
                    // .catch(error => reject(error));
                    
                    console.log('Upload complete!');
                    console.log('Form Data:', Object.fromEntries(formData));
                    resolve({ success: true, message: 'Upload successful' });
                } else {
                    this.updateProgress(progress);
                }
            }, 200);
        });
    }

    updateProgress(percent) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `Memuat naik... ${Math.round(percent)}%`;
    }

    showProgress() {
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = '0%';
    }

    hideProgress() {
        setTimeout(() => {
            this.progressContainer.style.display = 'none';
        }, 1000);
    }

    showSuccess() {
        this.successMessage.style.display = 'block';
        this.successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showError(message) {
        this.errorMessage.innerHTML = `❌ <strong>Ralat!</strong> ${message}`;
        this.errorMessage.style.display = 'block';
        this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.errorMessage.style.display = 'none';
        }, 5000);
    }

    hideMessages() {
        this.successMessage.style.display = 'none';
        this.errorMessage.style.display = 'none';
    }

    resetForm() {
        // Reset file
        this.currentFile = null;
        this.fileInput.value = '';
        
        // Reset form fields
        document.getElementById('title').value = '';
        document.getElementById('subject').value = '';
        document.getElementById('grade').value = '';
        document.getElementById('description').value = '';
        
        // Reset UI
        this.fileInfo.classList.remove('active');
        this.audioPlayer.src = '';
        this.hideForm();
        this.hideProgress();
        this.hideMessages();
        this.uploadBtn.disabled = false;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize uploader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AudioUploader();
});
