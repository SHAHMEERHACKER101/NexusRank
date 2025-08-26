/**
 * NexusRank Pro - FINAL JavaScript
 * 100% working with Cloudflare Worker + DeepSeek
 */

class NexusRankApp {
  constructor() {
    // ✅ Use full Worker URL (no relative /ai/)
    this.apiBaseUrl = 'https://nexusrank.shahshameer383.workers.dev';
    
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
    this.handleInstallPrompt();
  }

  bindEvents() {
    // ✅ Tool card clicks (entire card clickable)
    document.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const toolId = card.dataset.tool;
        if (toolId && this.tools[toolId]) {
          this.openTool(toolId);
        }
      });
    });

    // Modal close events
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.closeModal(e.target.closest('.modal'));
      });
    });

    // Modal background clicks
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
      processBtn.addEventListener('click', () => {
        this.processText();
      });
    }

    // Copy button
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyToClipboard();
      });
    }

    // Download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.downloadText();
      });
    }

    // Support modal buttons
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        this.openLoginModal();
      });
    }

    const patreonBtn = document.getElementById('patreonBtn');
    if (patreonBtn) {
      patreonBtn.addEventListener('click', () => {
        window.open('https://www.patreon.com/posts/seo-tools-137228615?utm_medium=clipboard_copy&utm_source=copyLink&utm_campaign=postshare_creator&utm_content=join_link', '_blank', 'noopener,noreferrer');
      });
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  openTool(toolId) {
    const tool = this.tools[toolId];
    if (!tool) return;

    // ✅ Check usage limits
    if (!this.isProUser && this.hasUsedTool(toolId)) {
      this.showSupportModal();
      return;
    }

    this.currentTool = toolId;
    
    // Configure modal
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
    
    // Reset output
    if (outputSection) {
      outputSection.style.display = 'none';
    }
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
      // Show loading state
      if (processBtn) processBtn.disabled = true;
      if (btnText) btnText.style.display = 'none';
      if (spinner) spinner.style.display = 'block';

      const response = await fetch(`${this.apiBaseUrl}${tool.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process text');
      }

      // Display result
      if (outputText) {
        outputText.innerHTML = this.formatOutput(data.content, this.currentTool);
      }
      if (outputSection) {
        outputSection.style.display = 'block';
      }

      // Mark tool as used (only for free users)
      if (!this.isProUser) {
        this.markToolAsUsed(this.currentTool);
      }

    } catch (error) {
      console.error('Processing error:', error);
      this.showError('Sorry, there was an error processing your request. Please try again.');
    } finally {
      // Reset button state
      if (processBtn) processBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (spinner) spinner.style.display = 'none';
    }
  }

  formatOutput(text, toolType) {
    const escapeHtml = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    const escapedText = escapeHtml(text);

    if (toolType === 'detect' && text.includes('AI Probability')) {
      return escapedText.replace(/\n/g, '<br>');
    }

    if (toolType === 'seo-write') {
      return escapedText
        .replace(/^(#{1,6})\s+(.+)$/gm, '<strong>$2</strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }

    return escapedText.replace(/\n/g, '<br>');
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
      this.showSuccess('Text copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = textContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showSuccess('Text copied to clipboard!');
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
    
    this.showSuccess('File downloaded successfully!');
  }

  hasUsedTool(toolId) {
    const usedTools = JSON.parse(localStorage.getItem('usedTools') || '[]');
    return usedTools.includes(toolId);
  }

  markToolAsUsed(toolId) {
    const usedTools = JSON.parse(localStorage.getItem('usedTools') || '[]');
    if (!usedTools.includes(toolId)) {
      usedTools.push(toolId);
      localStorage.setItem('usedTools', JSON.stringify(usedTools));
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
    
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.style.display = 'none';
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
  }

  handleLogin() {
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const errorDiv = document.getElementById('loginError');

    if (username === 'prouser606' && password === 'tUChSUZ7drfMkYm') {
      localStorage.setItem('proUser', 'true');
      this.isProUser = true;
      
      this.closeModal(document.getElementById('loginModal'));
      this.showSuccess('Welcome back! You now have unlimited access to all tools.');
      
      localStorage.removeItem('usedTools');
      
    } else {
      if (errorDiv) {
        errorDiv.textContent = 'Invalid username or password. Please check your credentials.';
        errorDiv.style.display = 'block';
      }
    }
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
    }
  }

  closeModal(modal) {
    if (modal) {
      modal.style.display = 'none';
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 3000;
      opacity: 0;
      transform: translateX(100px);
      transition: all 0.3s ease;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    if (type === 'error') {
      notification.style.background = 'linear-gradient(135deg, #ff4444, #cc3333)';
    } else if (type === 'success') {
      notification.style.background = 'linear-gradient(135deg, #00cc66, #00aa55)';
    } else {
      notification.style.background = 'linear-gradient(135deg, #0066ff, #0044cc)';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  }

  handleInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.showSuccess('NexusRank has been installed successfully!');
    });
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (typeof NexusRankApp !== 'undefined') {
    window.nexusRankApp = new NexusRankApp();
  }
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
