// NexusRank App - Main JavaScript File
class NexusRankApp {
    constructor() {
        this.apiBaseUrl = '/ai';
        this.tools = {
            'seo-writer': {
                title: 'AI SEO Writer',
                inputLabel: 'Enter your topic or keywords:',
                endpoint: '/seo-write',
                placeholder: 'e.g., "Best AI tools for content creation"'
            },
            'humanizer': {
                title: 'AI Humanizer',
                inputLabel: 'Enter AI-generated text to humanize:',
                endpoint: '/humanize',
                placeholder: 'Paste your AI-generated content here...'
            },
            'detector': {
                title: 'AI Content Detector',
                inputLabel: 'Enter text to analyze:',
                endpoint: '/detect',
                placeholder: 'Paste the text you want to analyze...'
            },
            'paraphraser': {
                title: 'Paraphrasing Tool',
                inputLabel: 'Enter text to paraphrase:',
                endpoint: '/paraphrase',
                placeholder: 'Enter the text you want to rewrite...'
            },
            'grammar': {
                title: 'Grammar Checker',
                inputLabel: 'Enter text to check grammar:',
                endpoint: '/grammar',
                placeholder: 'Paste your text here to check for grammar errors...'
            },
            'improver': {
                title: 'Text Improver',
                inputLabel: 'Enter text to improve:',
                endpoint: '/improve',
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
        // Tool card clicks
        document.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const toolId = card.dataset.tool;
                this.openTool(toolId);
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
        document.getElementById('processBtn').addEventListener('click', () => {
            this.processText();
        });

        // Copy button
        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyToClipboard();
        });

        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadText();
        });

        // Support modal buttons
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.openLoginModal();
        });

        document.getElementById('patreonBtn').addEventListener('click', () => {
            window.open('https://www.patreon.com/posts/seo-tools-137228615?utm_medium=clipboard_copy&utm_source=copyLink&utm_campaign=postshare_creator&utm_content=join_link', '_blank', 'noopener,noreferrer');
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

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

        // Check usage limits
        if (!this.isProUser && this.hasUsedTool(toolId)) {
            this.showSupportModal();
            return;
        }

        this.currentTool = toolId;
        
        // Configure modal
        document.getElementById('modalTitle').textContent = tool.title;
        document.getElementById('inputLabel').textContent = tool.inputLabel;
        document.getElementById('textInput').placeholder = tool.placeholder;
        
        // Reset form
        document.getElementById('textInput').value = '';
        document.querySelector('.output-section').style.display = 'none';
        document.getElementById('outputText').innerHTML = '';
        
        // Show modal
        this.showModal('toolModal');
    }

    async processText() {
        const textInput = document.getElementById('textInput');
        const processBtn = document.getElementById('processBtn');
        const btnText = processBtn.querySelector('.btn-text');
        const spinner = processBtn.querySelector('.spinner');
        const outputSection = document.querySelector('.output-section');
        const outputText = document.getElementById('outputText');

        const inputText = textInput.value.trim();
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
            processBtn.disabled = true;
            btnText.style.display = 'none';
            spinner.style.display = 'block';

            const response = await fetch(`${this.apiBaseUrl}${tool.endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: inputText,
                    tool: this.currentTool
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Display result
            outputText.innerHTML = this.formatOutput(data.result, this.currentTool);
            outputSection.style.display = 'block';

            // Mark tool as used (only for free users)
            if (!this.isProUser) {
                this.markToolAsUsed(this.currentTool);
            }

        } catch (error) {
            console.error('Processing error:', error);
            this.showError('Sorry, there was an error processing your request. Please try again.');
        } finally {
            // Reset button state
            processBtn.disabled = false;
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
        }
    }

    formatOutput(text, toolType) {
        // Escape HTML to prevent XSS
        const escapeHtml = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        const escapedText = escapeHtml(text);

        // For detector tool, format as structured data
        if (toolType === 'detector' && text.includes('Probability:')) {
            return escapedText.replace(/\n/g, '<br>');
        }

        // For SEO writer, preserve formatting
        if (toolType === 'seo-writer') {
            return escapedText
                .replace(/^(#{1,6})\s+(.+)$/gm, '<strong>$2</strong>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
        }

        // Default formatting
        return escapedText.replace(/\n/g, '<br>');
    }

    async copyToClipboard() {
        const outputText = document.getElementById('outputText');
        const textContent = outputText.textContent || outputText.innerText;
        
        try {
            await navigator.clipboard.writeText(textContent);
            this.showSuccess('Text copied to clipboard!');
        } catch (error) {
            // Fallback for older browsers
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
        const textContent = outputText.textContent || outputText.innerText;
        const tool = this.tools[this.currentTool];
        
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
        
        // Clear previous errors
        document.getElementById('loginError').style.display = 'none';
        document.getElementById('loginForm').reset();
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        // Check credentials
        if (username === 'prouser606' && password === 'tUChSUZ7drfMkYm') {
            // Store pro status
            localStorage.setItem('proUser', 'true');
            this.isProUser = true;
            
            this.closeModal(document.getElementById('loginModal'));
            this.showSuccess('Welcome back! You now have unlimited access to all tools.');
            
            // Clear usage tracking for pro user
            localStorage.removeItem('usedTools');
            
        } else {
            errorDiv.textContent = 'Invalid username or password. Please check your credentials.';
            errorDiv.style.display = 'block';
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'block';
        
        // Focus management
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, button');
            if (firstInput) firstInput.focus();
        }, 100);
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
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
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

        // Set colors based on type
        if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #ff4444, #cc3333)';
        } else if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #00cc66, #00aa55)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #0066ff, #0044cc)';
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Remove after 4 seconds
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

            // Show custom install button if desired
            // For now, we'll use the browser's default behavior
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.showSuccess('NexusRank has been installed successfully!');
        });
    }
}

// Utility functions
const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    },

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
};

// Performance monitoring
const Performance = {
    mark(name) {
        if (performance && performance.mark) {
            performance.mark(name);
        }
    },

    measure(name, startMark, endMark) {
        if (performance && performance.measure) {
            performance.measure(name, startMark, endMark);
        }
    },

    getEntriesByType(type) {
        if (performance && performance.getEntriesByType) {
            return performance.getEntriesByType(type);
        }
        return [];
    }
};

// Analytics (privacy-friendly, no external tracking)
const Analytics = {
    track(event, data = {}) {
        // Store analytics data locally for app improvement
        const analyticsData = JSON.parse(localStorage.getItem('analytics') || '[]');
        analyticsData.push({
            event,
            data,
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
        
        // Keep only last 100 events
        if (analyticsData.length > 100) {
            analyticsData.splice(0, analyticsData.length - 100);
        }
        
        localStorage.setItem('analytics', JSON.stringify(analyticsData));
    },

    pageView() {
        this.track('page_view', {
            page: window.location.pathname,
            title: document.title
        });
    },

    toolUsage(toolId) {
        this.track('tool_usage', {
            tool: toolId
        });
    }
};

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Analytics.track('error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Analytics.track('unhandled_rejection', {
        reason: event.reason.toString()
    });
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Performance.mark('app-init-start');
    
    const app = new NexusRankApp();
    Analytics.pageView();
    
    Performance.mark('app-init-end');
    Performance.measure('app-initialization', 'app-init-start', 'app-init-end');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        Analytics.track('page_visible');
    } else {
        Analytics.track('page_hidden');
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    Analytics.track('online');
    console.log('App is online');
});

window.addEventListener('offline', () => {
    Analytics.track('offline');
    console.log('App is offline');
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NexusRankApp, Utils, Performance, Analytics };
}
