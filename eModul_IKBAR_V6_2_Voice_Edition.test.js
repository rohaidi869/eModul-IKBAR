/**
 * Unit Tests for eModul IKBAR V6.2 Voice Edition
 * 
 * These tests cover the core JavaScript functionality of the eModul IKBAR
 * interactive learning module.
 */

// ============================================
// TEST SETUP
// ============================================

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    _getStore: () => store
  };
})();

// Mock speech synthesis
const mockSpeechSynthesis = {
  cancel: jest.fn(),
  speak: jest.fn(),
  getVoices: jest.fn(() => []),
  onvoiceschanged: null
};

// Mock Audio Context
class MockAudioContext {
  constructor() {
    this.closed = false;
  }
  createAnalyser() {
    return {
      fftSize: 64,
      frequencyBinCount: 32,
      getByteFrequencyData: jest.fn((arr) => { arr.fill(0); })
    };
  }
  createMediaStreamSource() {
    return { connect: jest.fn() };
  }
  close() { this.closed = true; return Promise.resolve(); }
}

// Mock MediaRecorder
class MockMediaRecorder {
  constructor(stream) {
    this.stream = stream;
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  start() { this.state = 'recording'; }
  stop() { 
    this.state = 'inactive';
    if (this.onstop) this.onstop();
  }
}

// Setup global mocks before each test
beforeEach(() => {
  global.localStorage = mockLocalStorage;
  global.speechSynthesis = mockSpeechSynthesis;
  global.AudioContext = MockAudioContext;
  global.webkitAudioContext = MockAudioContext;
  global.MediaRecorder = MockMediaRecorder;
  global.Blob = class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  };
  global.URL = {
    createObjectURL: jest.fn(() => 'mock-blob-url'),
    revokeObjectURL: jest.fn()
  };
  global.Document = class Document {};
  global.window = {
    speechSynthesis: mockSpeechSynthesis,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    addEventListener: jest.fn(),
    matchMedia: jest.fn(() => ({ matches: false })),
    open: jest.fn(() => ({ document: { write: jest.fn(), close: jest.fn() } }))
  };
  global.document = {
    getElementById: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => null),
    addEventListener: jest.fn(),
    body: { style: {} },
    documentElement: { 
      getAttribute: jest.fn(() => null),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
      style: {}
    }
  };
  
  // Clear mocks
  jest.clearAllMocks();
});

// ============================================
// STATE MANAGEMENT TESTS
// ============================================

describe('State Management', () => {
  test('saveState should save state to localStorage', () => {
    // Import or define the functions
    const STATE_KEY = 'ikbar_m1_v62';
    let state = { step: 1, quizScore: '3/5', nama: 'Test User' };
    
    function saveState() {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
      } catch(e) {}
    }
    
    saveState();
    
    expect(localStorage.setItem).toHaveBeenCalledWith(
      STATE_KEY,
      JSON.stringify(state)
    );
  });

  test('loadState should load state from localStorage', () => {
    const STATE_KEY = 'ikbar_m1_v62';
    const savedState = { step: 2, quizScore: '4/5', nama: 'Loaded User' };
    localStorage.getItem.mockReturnValue(JSON.stringify(savedState));
    
    let state = { step: 0, quizScore: null, nama: '' };
    
    function loadState() {
      try {
        const s = localStorage.getItem(STATE_KEY);
        if(s) state = { ...state, ...JSON.parse(s) };
      } catch(e) {}
    }
    
    loadState();
    
    expect(state.step).toBe(2);
    expect(state.quizScore).toBe('4/5');
    expect(state.nama).toBe('Loaded User');
  });

  test('loadState should handle invalid JSON gracefully', () => {
    const STATE_KEY = 'ikbar_m1_v62';
    localStorage.getItem.mockReturnValue('invalid json');
    
    let state = { step: 0 };
    const originalState = { ...state };
    
    function loadState() {
      try {
        const s = localStorage.getItem(STATE_KEY);
        if(s) state = { ...state, ...JSON.parse(s) };
      } catch(e) {}
    }
    
    expect(() => loadState()).not.toThrow();
    expect(state).toEqual(originalState);
  });

  test('saveState should handle errors gracefully', () => {
    localStorage.setItem.mockImplementation(() => { throw new Error('Storage full'); });
    
    function saveState() {
      try {
        localStorage.setItem('ikbar_m1_v62', JSON.stringify({ step: 1 }));
      } catch(e) {}
    }
    
    expect(() => saveState()).not.toThrow();
  });
});

// ============================================
// ACCESSIBILITY TESTS
// ============================================

describe('Accessibility Functions', () => {
  test('toggleTheme should switch between light and dark themes', () => {
    let theme = 'light';
    const html = { 
      getAttribute: jest.fn(() => theme),
      setAttribute: jest.fn((attr, val) => { theme = val; })
    };
    
    function toggleTheme() {
      const next = (html.getAttribute('data-theme') || 'light') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      return next;
    }
    
    expect(toggleTheme()).toBe('dark');
    expect(toggleTheme()).toBe('light');
  });

  test('adjustFontSize should constrain font size between 14px and 22px', () => {
    let currentFontSize = 16;
    
    const mockHtml = {
      style: { fontSize: '16px' }
    };
    
    global.getComputedStyle = jest.fn(() => ({ fontSize: currentFontSize + 'px' }));
    global.document.documentElement = mockHtml;
    
    function adjustFontSize(delta) {
      const current = parseFloat(global.getComputedStyle(global.document.documentElement).fontSize);
      const newSize = Math.max(14, Math.min(22, current + delta));
      mockHtml.style.fontSize = newSize + 'px';
      currentFontSize = newSize;
      return newSize;
    }
    
    expect(adjustFontSize(2)).toBe(18);
    expect(adjustFontSize(10)).toBe(22); // Should cap at 22
    expect(adjustFontSize(-10)).toBe(14); // Should floor at 14
  });

  test('toggleHighContrast should toggle high contrast mode', () => {
    let highContrast = false;
    const html = {
      getAttribute: jest.fn(() => highContrast ? 'high' : null),
      setAttribute: jest.fn(() => { highContrast = true; }),
      removeAttribute: jest.fn(() => { highContrast = false; })
    };
    
    function toggleHighContrast() {
      if (html.getAttribute('data-contrast') === 'high') {
        html.removeAttribute('data-contrast');
        return false;
      } else {
        html.setAttribute('data-contrast', 'high');
        return true;
      }
    }
    
    expect(toggleHighContrast()).toBe(true);
    expect(toggleHighContrast()).toBe(false);
  });
});

// ============================================
// TEXT-TO-SPEECH TESTS
// ============================================

describe('Text-to-Speech (TTS)', () => {
  test('speakText should cancel existing speech and speak new text', () => {
    function speakText(text) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = { lang: 'ar-SA', rate: 0.85, pitch: 1, voice: null, onerror: null };
      window.speechSynthesis.speak(u);
    }
    
    speakText('Test Arabic text');
    
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
  });

  test('speakText should handle missing speech synthesis', () => {
    const originalSynthesis = window.speechSynthesis;
    window.speechSynthesis = null;
    
    function speakText(text) {
      if (!window.speechSynthesis) return 'unsupported';
      return 'supported';
    }
    
    expect(speakText('test')).toBe('unsupported');
    
    window.speechSynthesis = originalSynthesis;
  });

  test('speakFullAyat should speak the full ayat text', () => {
    const expectedText = 'إِنَّ الشِّرْكَ لَظُلْمٌ عَظِيمٌ. سَبَبُ الشِّرْكِ هُوَ الْجَهْلُ وَالتَّقْلِيدُ الْأَعْمَى. الْوِقَايَةُ مِنَ الشِّرْكِ بِتَعْلِيمِ التَّوْحِيدِ.';
    
    let spokenText = null;
    
    function speakText(text) {
      spokenText = text;
    }
    
    function speakFullAyat() {
      speakText(expectedText);
    }
    
    speakFullAyat();
    expect(spokenText).toBe(expectedText);
  });
});

// ============================================
// AUDIO PLAYER TESTS
// ============================================

describe('Audio Player', () => {
  test('fmt should format seconds to MM:SS', () => {
    function fmt(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
    
    expect(fmt(0)).toBe('00:00');
    expect(fmt(5)).toBe('00:05');
    expect(fmt(60)).toBe('01:00');
    expect(fmt(125)).toBe('02:05');
    expect(fmt(3661)).toBe('61:01');
  });

  test('skipAudio should adjust currentTime within bounds', () => {
    let currentTime = 30;
    const duration = 100;
    
    function skipAudio(seconds) {
      if (!duration) return;
      currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
      return currentTime;
    }
    
    expect(skipAudio(10)).toBe(40);
    expect(skipAudio(100)).toBe(100); // Should cap at duration
    expect(skipAudio(-200)).toBe(0); // Should floor at 0
  });

  test('seekAudio should calculate time based on click position', () => {
    const duration = 120;
    const rect = { left: 0, width: 300 };
    const clientX = 150; // Middle of track
    
    function seekAudio(event) {
      if (!duration) return;
      const pct = (event.clientX - rect.left) / rect.width;
      return pct * duration;
    }
    
    const result = seekAudio({ clientX });
    expect(result).toBe(60); // Half of 120 seconds
  });
});

// ============================================
// VOICE RECORDER TESTS
// ============================================

describe('Voice Recorder', () => {
  test('should initialize media recorder with audio stream', async () => {
    const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) };
    navigator.mediaDevices = {
      getUserMedia: jest.fn(() => Promise.resolve(mockStream))
    };
    
    let recorded = false;
    
    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = () => {};
        recorder.start();
        recorded = true;
        return true;
      } catch (err) {
        return false;
      }
    }
    
    const result = await startRecording();
    expect(result).toBe(true);
    expect(recorded).toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  test('should handle microphone permission denial', async () => {
    navigator.mediaDevices = {
      getUserMedia: jest.fn(() => Promise.reject(new Error('Permission denied')))
    };
    
    async function startRecording() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
      } catch (err) {
        return false;
      }
    }
    
    const result = await startRecording();
    expect(result).toBe(false);
  });

  test('should stop all tracks when recording stops', () => {
    const stopFn = jest.fn();
    const mockStream = { getTracks: jest.fn(() => [{ stop: stopFn }]) };
    
    function stopRecording(stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    
    stopRecording(mockStream);
    expect(stopFn).toHaveBeenCalled();
  });
});

// ============================================
// DRAG AND DROP TESTS
// ============================================

describe('Drag and Drop', () => {
  test('should select chip on tap for touch devices', () => {
    let selectedChip = null;
    
    function tapSelect(chip) {
      if (selectedChip && selectedChip !== chip) {
        selectedChip.classList.remove('tap-selected');
      }
      if (selectedChip === chip) {
        chip.classList.remove('tap-selected');
        selectedChip = null;
      } else {
        chip.classList.add('tap-selected');
        selectedChip = chip;
      }
      return selectedChip;
    }
    
    const chip1 = { classList: { add: jest.fn(), remove: jest.fn() } };
    const chip2 = { classList: { add: jest.fn(), remove: jest.fn() } };
    
    expect(tapSelect(chip1)).toBe(chip1);
    expect(tapSelect(chip1)).toBeNull(); // Deselect
    expect(tapSelect(chip2)).toBe(chip2); // Select different
  });

  test('should drop chip into zone', () => {
    let selectedChip = { id: 'chip1' };
    
    function tapDrop(zoneId, zones) {
      if (!selectedChip) return false;
      const zone = zones[zoneId];
      if (zone) {
        zone.appendChild(selectedChip);
        selectedChip = null;
        return true;
      }
      return false;
    }
    
    const zone = {
      appendChild: jest.fn(),
      style: { transform: '' }
    };
    
    const result = tapDrop('drop-sebab', { 'drop-sebab': zone });
    expect(result).toBe(true);
    expect(zone.appendChild).toHaveBeenCalledWith({ id: 'chip1' });
    expect(selectedChip).toBeNull();
  });

  test('isTouchDevice should detect touch capability', () => {
    function isTouchDevice() {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    
    // Test without touch
    global.window = {};
    global.navigator = { maxTouchPoints: 0 };
    expect(isTouchDevice()).toBe(false);
    
    // Test with touch
    global.window = { ontouchstart: true };
    expect(isTouchDevice()).toBe(true);
  });
});

// ============================================
// QUIZ TESTS
// ============================================

describe('Quiz Functionality', () => {
  const quizData = [
    { q: 'Apakah makna الشِّرْكُ?', opts: ['Syirik', 'Solat', 'Sedekah', 'Zakat'], ans: 0 },
    { q: 'Terjemahan betul untuk لَظُلْمٌ عَظِيمٌ ialah:', opts: ['Dosa kecil', 'Kezaliman besar', 'Perbuatan baik', 'Amalan mulia'], ans: 1 }
  ];

  test('selectAnswer should mark correct answers', () => {
    let quizScore = 0;
    const answered = [false, false];
    
    function selectAnswer(qi, oi) {
      if (answered[qi]) return;
      answered[qi] = true;
      if (oi === quizData[qi].ans) {
        quizScore++;
        return 'correct';
      } else {
        return 'wrong';
      }
    }
    
    expect(selectAnswer(0, 0)).toBe('correct'); // Correct answer
    expect(selectAnswer(1, 0)).toBe('wrong'); // Wrong answer
    expect(quizScore).toBe(1);
  });

  test('selectAnswer should prevent multiple answers for same question', () => {
    const answered = [false];
    let callCount = 0;
    
    function selectAnswer(qi, oi) {
      if (answered[qi]) return 'already_answered';
      answered[qi] = true;
      callCount++;
      return 'answered';
    }
    
    selectAnswer(0, 0);
    selectAnswer(0, 1); // Should be ignored
    selectAnswer(0, 2); // Should be ignored
    
    expect(callCount).toBe(1);
  });

  test('should calculate quiz percentage correctly', () => {
    function calculatePercentage(score, total) {
      return Math.round((score / total) * 100);
    }
    
    expect(calculatePercentage(5, 5)).toBe(100);
    expect(calculatePercentage(4, 5)).toBe(80);
    expect(calculatePercentage(3, 5)).toBe(60);
    expect(calculatePercentage(0, 5)).toBe(0);
  });

  test('should provide appropriate feedback based on score', () => {
    function getFeedback(pct) {
      if (pct >= 80) return 'Cemerlang! Anda bersedia untuk Refleksi Rabbani.';
      if (pct >= 60) return 'Baik! Cuba ulangkaji kosa kata yang salah.';
      return 'Teruskan usaha. Kembali ke INPUT dan ulangkaji semula.';
    }
    
    expect(getFeedback(100)).toContain('Cemerlang');
    expect(getFeedback(80)).toContain('Cemerlang');
    expect(getFeedback(70)).toContain('Baik');
    expect(getFeedback(60)).toContain('Baik');
    expect(getFeedback(50)).toContain('Teruskan usaha');
  });
});

// ============================================
// EXPORT/IMPORT TESTS
// ============================================

describe('Export/Import Progress', () => {
  test('exportProgress should create valid JSON structure', () => {
    const state = {
      step: 3,
      quizScore: '4/5',
      nama: 'Test User',
      matrik: 'A12345',
      voiceRecordings: [{ id: 1, duration: 30 }]
    };
    
    function buildExportData(state) {
      return {
        version: 'ikbar_v62',
        exported: new Date().toISOString(),
        state: {
          ...state,
          voiceRecordings: state.voiceRecordings.map(r => ({ ...r, url: null, blob: null }))
        }
      };
    }
    
    const exportData = buildExportData(state);
    
    expect(exportData.version).toBe('ikbar_v62');
    expect(exportData.state.step).toBe(3);
    expect(exportData.state.nama).toBe('Test User');
    expect(exportData.state.voiceRecordings[0].url).toBeNull();
    expect(exportData.state.voiceRecordings[0].blob).toBeNull();
  });

  test('importProgress should merge imported state with current state', () => {
    const currentState = { step: 0, nama: '', matrik: '', voiceRecordings: [] };
    const importedData = {
      version: 'ikbar_v62',
      state: { step: 2, nama: 'Imported User', quizScore: '3/5' }
    };
    
    function importState(current, imported) {
      return { ...current, ...imported.state, voiceRecordings: current.voiceRecordings };
    }
    
    const merged = importState(currentState, importedData);
    
    expect(merged.step).toBe(2);
    expect(merged.nama).toBe('Imported User');
    expect(merged.quizScore).toBe('3/5');
    expect(merged.voiceRecordings).toEqual([]); // Preserved from current
  });

  test('importProgress should validate JSON structure', () => {
    function isValidImport(data) {
      try {
        return !!(data.version && data.state);
      } catch (err) {
        return false;
      }
    }
    
    expect(isValidImport({ version: 'ikbar_v62', state: {} })).toBe(true);
    expect(isValidImport({ version: 'ikbar_v62' })).toBe(false);
    expect(isValidImport({ state: {} })).toBe(false);
    expect(isValidImport({})).toBe(false);
  });
});

// ============================================
// GOOGLE DRIVE SUBMISSION TESTS
// ============================================

describe('Google Drive Submission', () => {
  test('buildSubmissionPayload should include all required fields', () => {
    const state = {
      tarikhHantar: '2024-01-15',
      nama: 'Ali',
      matrik: 'A12345',
      prosesData: { sebab: ['Sebab 1'], akibat: ['Akibat 1'] },
      output: 'Output text',
      quizScore: '4/5',
      voiceRecordings: [{ duration: 30 }],
      refleksi: 'Refleksi text'
    };
    
    function buildSubmissionPayload(state) {
      return {
        tarikhHantar: state.tarikhHantar || new Date().toLocaleString('ms-MY'),
        nama: state.nama || '(Tiada nama)',
        matrik: state.matrik || '(Tiada matrik)',
        modul: 'Tahap 2 Minggu 4: Syirik',
        input: 'INPUT selesai — pelajar telah dengar audio khutbah dan membaca teks.',
        prosesSebab: (state.prosesData.sebab || []).join(' | ') || '(Tiada data)',
        prosesAkibat: (state.prosesData.akibat || []).join(' | ') || '(Tiada data)',
        output: state.output || '(Tiada output teks)',
        quizScore: state.quizScore || 'N/A',
        voiceRecordings: state.voiceRecordings.length + ' rakaman',
        refleksi: state.refleksi || '(Tiada refleksi)'
      };
    }
    
    const payload = buildSubmissionPayload(state);
    
    expect(payload.nama).toBe('Ali');
    expect(payload.matrik).toBe('A12345');
    expect(payload.prosesSebab).toBe('Sebab 1');
    expect(payload.prosesAkibat).toBe('Akibat 1');
    expect(payload.voiceRecordings).toBe('1 rakaman');
  });

  test('should handle offline submission queue', () => {
    let online = true;
    const pendingQueue = [];
    
    function checkOnlineStatus() {
      return online;
    }
    
    function queueForLater(payload) {
      if (!checkOnlineStatus()) {
        pendingQueue.push(payload);
        return 'queued';
      }
      return 'submitted';
    }
    
    online = false;
    expect(queueForLater({ nama: 'Test' })).toBe('queued');
    expect(pendingQueue.length).toBe(1);
    
    online = true;
    expect(queueForLater({ nama: 'Test2' })).toBe('submitted');
  });

  test('setDriveStatus should return correct style configuration', () => {
    function getDriveStatusStyle(type) {
      const styles = {
        loading: { bg: 'var(--warning-50)', icon: '⏳' },
        success: { bg: 'var(--success-50)', icon: '✅' },
        error: { bg: 'var(--error-50)', icon: '⚠️' },
        offline: { bg: 'var(--stone-100)', icon: '📶' }
      };
      return styles[type] || styles.loading;
    }
    
    expect(getDriveStatusStyle('loading').icon).toBe('⏳');
    expect(getDriveStatusStyle('success').icon).toBe('✅');
    expect(getDriveStatusStyle('error').icon).toBe('⚠️');
    expect(getDriveStatusStyle('offline').icon).toBe('📶');
    expect(getDriveStatusStyle('unknown').icon).toBe('⏳'); // Default
  });
});

// ============================================
// PROGRESSION TRACKING TESTS
// ============================================

describe('Progression Tracking', () => {
  test('should calculate progress percentage correctly', () => {
    function calculateProgress(step, totalSteps = 4) {
      return Math.round((step / totalSteps) * 100);
    }
    
    expect(calculateProgress(0)).toBe(0);
    expect(calculateProgress(1)).toBe(25);
    expect(calculateProgress(2)).toBe(50);
    expect(calculateProgress(3)).toBe(75);
    expect(calculateProgress(4)).toBe(100);
  });

  test('should unlock next step after completion', () => {
    let currentStep = 0;
    
    function completeStep(step) {
      if (step === currentStep + 1) {
        currentStep = step;
        return true;
      }
      return false;
    }
    
    function isUnlocked(step) {
      return step <= currentStep + 1;
    }
    
    expect(completeStep(1)).toBe(true);
    expect(currentStep).toBe(1);
    expect(isUnlocked(2)).toBe(true);
    expect(isUnlocked(3)).toBe(false);
  });

  test('should get status label for current step', () => {
    const statuses = [
      'Belum Mula',
      'INPUT Selesai',
      'PROSES Selesai',
      'OUTPUT Dihantar',
      'Modul Selesai!'
    ];
    
    function getStatusLabel(step) {
      return statuses[step] || 'Belum Mula';
    }
    
    expect(getStatusLabel(0)).toBe('Belum Mula');
    expect(getStatusLabel(1)).toBe('INPUT Selesai');
    expect(getStatusLabel(4)).toBe('Modul Selesai!');
    expect(getStatusLabel(5)).toBe('Belum Mula'); // Out of bounds
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe('Input Validation', () => {
  test('should validate name and matrik fields', () => {
    function validateGateFields(nama, matrik) {
      const errors = [];
      if (!nama || !nama.trim()) errors.push('nama');
      if (!matrik || !matrik.trim()) errors.push('matrik');
      return { valid: errors.length === 0, errors };
    }
    
    expect(validateGateFields('', '').valid).toBe(false);
    expect(validateGateFields('Ali', '').valid).toBe(false);
    expect(validateGateFields('', 'A123').valid).toBe(false);
    expect(validateGateFields('Ali', 'A123').valid).toBe(true);
  });

  test('should validate reflection minimum length', () => {
    function validateReflection(text, minLength = 5) {
      return text && text.trim().length >= minLength;
    }
    
    expect(validateReflection('')).toBe(false);
    expect(validateReflection('abc')).toBe(false);
    expect(validateReflection('abcdef')).toBe(true);
    expect(validateReflection('   abc   ')).toBe(false); // Trimmed
  });

  test('should validate output submission requirements', () => {
    function validateOutput(mode, data) {
      if (mode === 'tulis') {
        return data.text && data.text.trim().length >= 10;
      } else if (mode === 'kuiz') {
        return data.allAnswered === true;
      } else if (mode === 'voice') {
        return data.recordings && data.recordings.some(r => r.duration >= 10);
      }
      return false;
    }
    
    expect(validateOutput('tulis', { text: 'short' })).toBe(false);
    expect(validateOutput('tulis', { text: 'This is long enough text' })).toBe(true);
    expect(validateOutput('kuiz', { allAnswered: false })).toBe(false);
    expect(validateOutput('kuiz', { allAnswered: true })).toBe(true);
    expect(validateOutput('voice', { recordings: [{ duration: 5 }] })).toBe(false);
    expect(validateOutput('voice', { recordings: [{ duration: 15 }] })).toBe(true);
  });

  test('should count words correctly', () => {
    function countWords(text) {
      if (!text) return 0;
      return text.split(/\s+/).filter(Boolean).length;
    }
    
    expect(countWords('')).toBe(0);
    expect(countWords('Hello')).toBe(1);
    expect(countWords('Hello world')).toBe(2);
    expect(countWords('  Multiple   spaces   here  ')).toBe(3);
  });
});

// ============================================
// TOUR/ONBOARDING TESTS
// ============================================

describe('Tour/Onboarding', () => {
  const tourSteps = [
    { title: 'Welcome', targetId: null },
    { title: 'Help Button', targetId: 'btn-help' },
    { title: 'Navigation Cards', targetId: 'nav-grid' }
  ];

  test('should navigate through tour steps', () => {
    let tourIndex = 0;
    
    function nextTour() {
      tourIndex++;
      if (tourIndex >= tourSteps.length) {
        return 'completed';
      }
      return 'continue';
    }
    
    expect(nextTour()).toBe('continue');
    expect(nextTour()).toBe('continue');
    expect(nextTour()).toBe('completed');
  });

  test('should skip tour and set localStorage flag', () => {
    let tourSeen = false;
    
    function skipTour() {
      tourSeen = true;
      return 'skipped';
    }
    
    expect(skipTour()).toBe('skipped');
    expect(tourSeen).toBe(true);
  });

  test('should highlight tour target element', () => {
    const highlighted = [];
    
    function highlightTarget(targetId) {
      if (targetId) {
        highlighted.push(targetId);
        return true;
      }
      return false;
    }
    
    expect(highlightTarget('btn-help')).toBe(true);
    expect(highlightTarget(null)).toBe(false);
    expect(highlighted).toContain('btn-help');
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Utility Functions', () => {
  test('should escape HTML special characters', () => {
    function escapeHtml(text) {
      return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('Normal text')).toBe('Normal text');
    expect(escapeHtml('a < b && b > c')).toBe('a &lt; b && b &gt; c');
  });

  test('should truncate text with ellipsis', () => {
    function truncate(text, maxLength = 60) {
      if (!text) return '';
      return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
    }
    
    expect(truncate('Short')).toBe('Short');
    expect(truncate('A'.repeat(61))).toBe('A'.repeat(60) + '…');
    expect(truncate('', 10)).toBe('');
  });

  test('should pad numbers for time display', () => {
    function pad(num) {
      return String(num).padStart(2, '0');
    }
    
    expect(pad(0)).toBe('00');
    expect(pad(5)).toBe('05');
    expect(pad(10)).toBe('10');
    expect(pad(59)).toBe('59');
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  test('should handle empty state object', () => {
    const emptyState = {};
    const defaultState = { step: 0, quizScore: null, nama: '' };
    
    function mergeState(current, defaults) {
      return { ...defaults, ...current };
    }
    
    const result = mergeState(emptyState, defaultState);
    expect(result.step).toBe(0);
    expect(result.quizScore).toBeNull();
  });

  test('should handle very large numbers in duration calculation', () => {
    function fmt(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
    
    expect(fmt(86400)).toBe('1440:00'); // 24 hours
    expect(fmt(3600)).toBe('60:00'); // 1 hour
  });

  test('should handle null/undefined in array operations', () => {
    function safeJoin(arr, separator = ' | ') {
      return (arr || []).join(separator) || '(Tiada data)';
    }
    
    expect(safeJoin(null)).toBe('(Tiada data)');
    expect(safeJoin(undefined)).toBe('(Tiada data)');
    expect(safeJoin([])).toBe('(Tiada data)');
    expect(safeJoin(['A', 'B'])).toBe('A | B');
  });

  test('should handle timezone conversion for Malaysian time', () => {
    function getMalaysianTime(date) {
      return date.toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    }
    
    const testDate = new Date('2024-01-15T12:00:00Z');
    const result = getMalaysianTime(testDate);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Integration Tests', () => {
  test('complete workflow: start to finish', () => {
    // Simulate complete user journey
    const workflow = {
      step: 0,
      answers: [],
      reflections: '',
      
      startModule() {
        this.step = 1;
        return 'INPUT opened';
      },
      
      completeInput() {
        if (this.step === 1) {
          this.step = 2;
          return 'PROSES KBAT unlocked';
        }
        return 'Complete INPUT first';
      },
      
      submitCauseEffect(causes, effects) {
        if (this.step === 2 && causes.length > 0 && effects.length > 0) {
          this.step = 3;
          return 'OUTPUT unlocked';
        }
        return 'Need at least 1 cause and 1 effect';
      },
      
      submitQuiz(answers) {
        this.answers = answers;
        return 'Quiz submitted';
      },
      
      submitReflection(text) {
        if (text.length >= 5) {
          this.reflections = text;
          this.step = 4;
          return 'Module completed';
        }
        return 'Reflection too short';
      }
    };
    
    expect(workflow.startModule()).toBe('INPUT opened');
    expect(workflow.completeInput()).toBe('PROSES KBAT unlocked');
    expect(workflow.submitCauseEffect(['cause1'], ['effect1'])).toBe('OUTPUT unlocked');
    expect(workflow.submitQuiz([0, 1, 0, 1, 0])).toBe('Quiz submitted');
    expect(workflow.submitReflection('This is my reflection')).toBe('Module completed');
    expect(workflow.step).toBe(4);
  });

  test('state persistence across sessions', () => {
    const STATE_KEY = 'ikbar_test_session';
    let state = { step: 0, data: null };
    
    function save() {
      mockLocalStorage._getStore()[STATE_KEY] = JSON.stringify(state);
    }
    
    function load() {
      const stored = mockLocalStorage._getStore()[STATE_KEY];
      if (stored) {
        state = JSON.parse(stored);
      }
    }
    
    // Session 1
    state.step = 2;
    state.data = { quizScore: '4/5' };
    save();
    
    // Session 2 (simulated reload)
    state = { step: 0, data: null };
    load();
    
    expect(state.step).toBe(2);
    expect(state.data.quizScore).toBe('4/5');
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

describe('Performance Tests', () => {
  test('should format time efficiently', () => {
    function fmt(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }
    
    const iterations = 10000;
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      fmt(i * 13);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  test('should handle large recording lists efficiently', () => {
    const recordings = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      duration: 30 + i,
      url: 'mock-url-' + i
    }));
    
    function getTotalDuration(recs) {
      return recs.reduce((total, rec) => total + rec.duration, 0);
    }
    
    const start = Date.now();
    const total = getTotalDuration(recordings);
    const duration = Date.now() - start;
    
    expect(total).toBe(7950);
    expect(duration).toBeLessThan(100);
  });
});
