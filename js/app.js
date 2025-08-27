/**
 * NexusRank Pro - FINAL app.js
 * 100% FREE: AI runs in browser via WebLLM (no server, no API key)
 * 5-6 line powerful prompts, 1 free use, Patreon popup, pro login
 */

class NexusRankApp {
  constructor() {
    this.currentTool = null;
    this.isProUser = this.checkProStatus();
    this.chat = null; // WebLLM chat instance
    this.modelLoaded = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.registerServiceWorker();
    this.setupFooterLinks();
  }

  setupFooterLinks() {
    document.querySelectorAll('footer a').forEach(a => {
      if (a.getAttribute('href').startsWith('/pages/')) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
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

  get tools() {
    return {
      'seo-write': {
        title: 'AI SEO Writer',
        inputLabel: 'Enter your topic or keywords:',
        placeholder: 'e.g., "Best AI tools for content creation"',
        system: `You are an expert SEO content strategist. Create comprehensive, high-quality articles that provide real value to readers and follow Google's E-E-A-T guidelines.

Write in a natural, conversational tone with varied sentence structure. Use proper H2 and H3 headings, bullet points, and short paragraphs to enhance readability.

Incorporate relevant keywords naturally—do not keyword stuff. Focus on user intent, content depth, and semantic structure.

Your goal is to produce original, engaging content that ranks well and genuinely helps users—without sounding robotic or formulaic.

Include meta description suggestions and an FAQ section when relevant. Make it 3000+ words if possible.`
      },
      'humanize': {
        title: 'AI Humanizer',
        inputLabel: 'Enter AI-generated text to humanize:',
        placeholder: 'Paste your AI-generated content here...',
        system: `Transform AI-generated text into natural, human-like writing. Add contractions, slight imperfections, and conversational flow to mimic real human patterns.

Vary sentence length and structure. Use casual transitions and personal tone where appropriate. Avoid overly formal or repetitive language.

Preserve the original meaning and key information while making the text sound authentic and relatable.

The result should be indistinguishable from content written by a skilled human writer.

Do not add or remove facts—only rephrase for authenticity and engagement.`
      },
      'detect': {
        title: 'AI Content Detector',
        inputLabel: 'Enter text to analyze:',
        placeholder: 'Paste the text you want to analyze...',
        system: `Analyze the provided text for patterns commonly associated with AI generation. Look for uniform sentence length, repetitive phrasing, lack of personal voice, and overuse of transitional words.

Provide a balanced assessment of AI likelihood based on linguistic and structural indicators. Avoid absolute statements—focus on probabilities and observable patterns.

Respond with: "AI Probability: X%" followed by a concise 2-sentence explanation of your reasoning.

Your analysis should be informative, not alarmist, and help users understand the nature of the content.

Do not claim 100% accuracy—AI detection is probabilistic.`
      },
      'paraphrase': {
        title: 'Paraphrasing Tool',
        inputLabel: 'Enter text to paraphrase:',
        placeholder: 'Enter the text you want to rewrite...',
        system: `Rewrite the text to be completely original while preserving the core meaning and intent. Use different vocabulary, sentence structures, and phrasing to create a fresh version.

Avoid simple synonym replacement. Focus on rephrasing ideas in a new way while maintaining clarity and accuracy.

Ensure the output is natural, readable, and suitable for content creators who need unique versions of existing material.

Do not add or remove key information—only restructure and reword for originality.

Make it undetectable as AI while keeping the message intact.`
      },
      'grammar': {
        title: 'Grammar Checker',
        inputLabel: 'Enter text to check grammar:',
        placeholder: 'Paste your text here to check for grammar errors...',
        system: `Review the text and correct all grammar, spelling, punctuation, and capitalization errors. Fix subject-verb agreement, tense consistency, and word usage mistakes.

Return only the corrected version—do not include explanations unless the context is ambiguous.

Preserve the original tone, style, and formatting while improving technical accuracy.

The final text should be polished, professional, and free of mechanical errors.

Do not change the meaning—only fix errors.`
      },
      'improve': {
        title: 'Text Improver',
        inputLabel: 'Enter text to improve:',
        placeholder: 'Enter text you want to enhance for clarity and professionalism...',
        system: `Enhance the text for clarity, fluency, and overall effectiveness. Improve sentence flow, word choice, and paragraph structure to make it more engaging.

Simplify complex sentences, eliminate redundancy, and strengthen weak transitions. Ensure the message is clear and impactful.

Maintain the original intent and voice while elevating the quality of writing.

Focus on readability, coherence, and audience engagement.

The improved version should be more persuasive and professional than the original.`
      }
    };
  }

  async openTool(toolId) {
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

      // Initialize WebLLM if not already loaded
      if (!this.modelLoaded) {
        await this.loadModel();
      }

      // Generate prompt
      const prompt = `System: ${tool.system}\n\nUser: ${inputText}\n\nAssistant:`;

      // Run AI in browser
      const result = await this.chat.generate(prompt);
      const aiText = result.trim();

      // Show output
      if (outputText) {
        outputText.innerHTML = this.formatOutput(aiText);
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
      this.showError('AI failed to run. Try again. (Need Chrome/Firefox)');
    } finally {
      // Reset button
      if (processBtn) processBtn.disabled = false;
      if (btnText) btnText.style.display = 'inline';
      if (spinner) spinner.style.display = 'none';
    }
  }

  async loadModel() {
    try {
      this.showModal('loadingModal');
      this.chat = new webllm.ChatModule();
      await this.chat.init({ model: "Llama-3-8b-Instruct-q4f16_1" });
      this.modelLoaded = true;
      this.closeModal(document.getElementById('loadingModal'));
      this.showSuccess('AI model loaded! Ready to use.');
    } catch (error) {
      this.closeModal(document.getElementById('loadingModal'));
      this.showError('Failed to load AI model. Check browser compatibility.');
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
