/**
 * NexusRank Pro - FINAL app.js
 * 100% working with DeepSeek + Cloudflare Worker
 */

class NexusRankApp {
  constructor() {
    // ✅ Use full Worker URL (NO trailing slash!)
    this.apiBaseUrl = 'https://nexusrankpro.shahshameer383.workers.dev';
    
    this.tools = {
      'seo-write': {
        title: 'AI SEO Writer',
        inputLabel: 'Enter your topic or keywords:',
        endpoint: '/ai/seo-write',
        placeholder: 'e.g., "Best AI tools for content creation"'
      },
      'humanize': {
        title: 'AI Humanizer',
        inputLabel: 'Enter AI-generated text to humanize:',
        endpoint: '/ai/humanize',
        placeholder: 'Paste your AI-generated content here...'
      },
      'detect': {
        title: 'AI Content Detector',
        inputLabel: 'Enter text to analyze:',
        endpoint: '/ai/detect',
        placeholder: 'Paste the text you want to analyze...'
      },
      'paraphrase': {
        title: 'Paraphrasing Tool',
        inputLabel: 'Enter text to paraphrase:',
        endpoint: '/ai/paraphrase',
        placeholder: 'Enter the text you want to rewrite...'
      },
      'grammar': {
        title: 'Grammar Checker',
        inputLabel: 'Enter text to check grammar:',
        endpoint: '/ai/grammar',
        placeholder: 'Paste your text here to check for grammar errors...'
      },
      'improve': {
        title: 'Text Improver',
        inputLabel: 'Enter text to improve:',
        endpoint: '/ai/improve',
        placeholder: 'Enter text you want to enhance for clarity and professionalism...'
      }
    };
    
    this.currentTool = null;
    this.isProUser = this.checkProStatus();
    this.init();
  }

  init() {
    this.bindEvents();
    this.registerServiceWorker();
  }

  bindEvents() {
    // Tool card clicks
    document.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const toolId = card.dataset.tool;
        if (toolId && this.tools[toolId]) {
          this.openTool(toolId);
        }
      });
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.closeModal(e.target.closest('.modal'));
      });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal);
        }
      });
    });

    // Process button
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
      processBtn.addEventListener('click', () => this.processText());
    }

    // Copy button
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    // Download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadText());
    }

    // Login button in support modal
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.openLoginModal());
    }

    // Patreon button
    const patreonBtn = document.getElementById('patreonBtn');
    if (patreonBtn) {
      patreonBtn.addEventListener('click', () => {
        window.open('https://www.patreon.com/posts/seo-tools-137228615?utm_medium=clipboard_copy&utm_source=copyLink&utm_campaign=postshare_creator&utm_content=join_link', '_blank', 'noopener,noreferrer');
      });
    }

    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  openTool(toolId) {
    const tool = this.tools[toolId];
    if (!tool) return;

    // Check usage limit
    if (!this.isProUser && this.hasUsedTool(toolId)) {
      this.showSupportModal();
      return;
    }

    this.currentTool = toolId;

    // Update modal UI
    const modalTitle = document.getElementById('modalTitle');
    const inputLabel = document.getElementById('inputLabel');
    const textInput = document.getElementById('textInput');
    const outputSection = document.querySelector('.output-section');

    if (modalTitle) modalTitle.textContent = tool.title;
    if (inputLabel) inputLabel.textContent = tool.inputLabel;
    if (textInput) {
      textInput.placeholder = tool.placeholder;
      textInput.value = '';
    }
    if (outputSection) outputSection.style.display = 'none';
    const outputText = document.getElementById('outputText');
    if (outputText) outputText.innerHTML = '';

    // Show modal
    this.showModal('toolModal');
  }

  async processText() {
    const textInput = document.getElementById('textInput');
    const processBtn = document.getElementById('processBtn');
    const btnText = processBtn?.querySelector('.btn-text');
    const spinner = processBtn?.querySelector('.spinner');
    const outputSection = document.querySelector('.output-section');
    const outputText = document.getElementById('outputText');

    const inputText = textInput?.value.trim();
    if (!inputText) {
      this.showError('Please enter some text to process.');
      return;
    }

    if (inputText.length > 5000) {
      this.showError('Text is too long. Please limit to 5000 characters.');
      return;
    }

    const tool = this.tools[this.currentTool];
    if (!tool) return;

    try {
      // Show loading
      if (processBtn) processBtn.disabled = true;
      if (btnText) btnText.style.display = 'none';
      if (spinner) spinner.style.display = 'block';

      const response = await fetch(`${this.apiBaseUrl}${tool.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      // Show output
      if (outputText) {
        outputText.innerHTML = this.formatOutput(data.content);
      }
      if (outputSection) {
        outputSection.style.display = 'block';
      }

      // Mark as used (free users only)
      if (!this.isProUser) {
        this.markToolAsUsed(this.currentTool);
      }

    } catch (error) {
      console.error('Processing error:', error);
      this.showError('Failed to connect to AI service. Please try again.');
    } finally {
      // Reset button
      if (processBtn) processBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (spinner) spinner.style.display = 'none';
    }
  }

  formatOutput(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  async copyToClipboard() {
    const outputText = document.getElementById('outputText');
    const textContent = outputText?.textContent || '';
    if (!textContent) {
      this.showError('No content to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(textContent);
      this.showSuccess('Copied to clipboard!');
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = textContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showSuccess('Copied to clipboard!');
    }
  }

  downloadText() {
    const outputText = document.getElementById('outputText');
    const textContent = outputText?.textContent || '';
    const tool = this.tools[this.currentTool];
    if (!textContent) {
      this.showError('No content to download');
      return;
    }

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.title.replace(/\s+/g, '_').toLowerCase()}_result.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showSuccess('Downloaded successfully!');
  }

  hasUsedTool(toolId) {
    const used = JSON.parse(localStorage.getItem('usedTools') || '[]');
    return used.includes(toolId);
  }

  markToolAsUsed(toolId) {
    const used = JSON.parse(localStorage.getItem('usedTools') || '[]');
    if (!used.includes(toolId)) {
      used.push(toolId);
      localStorage.setItem('usedTools', JSON.stringify(used));
    }
  }

  checkProStatus() {
    return localStorage.getItem('proUser') === 'true';
  }

  showSupportModal() {
    this.showModal('supportModal');
  }

  openLoginModal() {
    this.closeModal(document.getElementById('supportModal'));
    this.showModal('loginModal');
    document.getElementById('loginError')?.classList.add('hidden');
    document.getElementById('loginForm')?.reset();
  }

  handleLogin() {
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const errorEl = document.getElementById('loginError');

    if (username === 'prouser606' && password === 'tUChSUZ7drfMkYm') {
      localStorage.setItem('proUser', 'true');
      this.isProUser = true;
      this.closeModal(document.getElementById('loginModal'));
      this.showSuccess('Welcome! You now have unlimited access.');
      localStorage.removeItem('usedTools');
    } else {
      if (errorEl) {
        errorEl.textContent = 'Invalid credentials';
        errorEl.classList.remove('hidden');
      }
    }
  }

  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
  }

  closeModal(modal) {
    if (modal) modal.style.display = 'none';
  }

  closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  }

  showError(msg) {
    this.showToast(msg, 'error');
  }

  showSuccess(msg) {
    this.showToast(msg, 'success');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 12px 20px;
      background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#00cc66' : '#0066ff'};
      color: white; border-radius: 6px; z-index: 3000; opacity: 0;
      transform: translateX(100px); transition: all 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 100);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 4000);
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (e) {
        console.log('SW registration failed');
      }
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new NexusRankApp();
});
