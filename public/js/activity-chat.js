/**
 * Activity Chat Widget
 * Sistem chat sederhana: semua user chat dengan owner, owner melihat daftar percakapan
 */
(function() {
    'use strict';

    class ActivityChat {
        constructor(config) {
            this.activityId = config.activityId;
            this.userId = String(config.userId);
            this.ownerId = String(config.ownerId);
            this.ownerName = config.ownerName || 'Owner';
            this.isOwner = (this.userId === this.ownerId);
            this.currentTargetUserId = this.isOwner ? null : this.userId;
            this.pollingInterval = null;
            this.unreadPollingInterval = null;
            this.isOpen = false;

            // Elements
            this.btn = document.getElementById('toggle-chat-btn');
            this.widget = document.getElementById('chat-widget');
            this.closeBtn = document.getElementById('close-chat');
            this.backBtn = document.getElementById('back-to-conversations');
            this.titleEl = document.getElementById('chat-title');
            this.conversationsEl = document.getElementById('chat-conversations');
            this.messagesEl = document.getElementById('chat-messages');
            this.inputArea = document.getElementById('chat-input-area');
            this.loadingEl = document.getElementById('chat-loading');
            this.chatForm = document.getElementById('chat-form');
            this.badge = document.getElementById('chat-unread-badge');

            // Routes
            this.routes = {
                conversations: config.routes.conversations,
                messages: config.routes.messages,
                send: config.routes.send,
                unreadCount: config.routes.unreadCount || null
            };

            // CSRF Token
            this.csrfToken = config.csrfToken;

            this.init();
            
            // Start polling for unread count
            this.startUnreadPolling();
        }

        init() {
            if (!this.validateElements()) {
                return;
            }

            

            // Global toggle function
            window.toggleChatWidget = () => this.toggle();

            // Event listeners
            if (this.btn) {
                this.btn.addEventListener('click', () => this.toggle());
            }

            if (this.closeBtn) {
                this.closeBtn.addEventListener('click', () => this.close());
            }

            if (this.backBtn) {
                this.backBtn.addEventListener('click', () => {
                    if (this.isOwner) {
                        this.showConversations();
                    }
                });
            }

            if (this.chatForm) {
                this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
            }

            // Ensure input is clickable and focusable
            if (this.inputArea) {
                const input = this.inputArea.querySelector('input[name="message"]');
                if (input) {
                    // Make sure input is always clickable
                    input.style.pointerEvents = 'auto';
                    input.style.cursor = 'text';
                    input.removeAttribute('readonly');
                    input.removeAttribute('disabled');
                    
                    // Add click event to ensure it's working
                    input.addEventListener('click', (e) => {
                        e.stopPropagation();
                        input.focus();
                    });
                    
                    // Add focus event
                    input.addEventListener('focus', () => {});
                }
            }
        }

        validateElements() {
            return !!(this.btn && this.widget && this.messagesEl && this.inputArea);
        }

        toggle() {
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                this.widget.classList.remove('hidden');
                setTimeout(() => {
                    this.widget.classList.remove('scale-95', 'opacity-0');
                }, 10);
                this.initChat();
            } else {
                this.close();
            }
        }

        close() {
            this.isOpen = false;
            this.widget.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                this.widget.classList.add('hidden');
            }, 300);
            this.stopPolling();
            // Keep unread polling running even when closed
        }

        initChat() {
            
            
            if (this.isOwner) {
                // Owner sees list of conversations
                this.showConversations();
            } else {
                // User chats directly with owner
                this.openChat(this.userId, this.ownerName);
            }
        }

        showConversations() {
            // CRITICAL: Only for owner
            if (!this.isOwner) {
                // console.error('showConversations called by non-owner! Redirecting to chat...');
                this.openChat(this.userId, this.ownerName);
                return;
            }

            
            this.stopPolling();
            this.currentTargetUserId = null;

            if (this.titleEl) this.titleEl.textContent = 'Daftar Percakapan';
            if (this.backBtn) this.backBtn.classList.add('hidden');
            if (this.conversationsEl) this.conversationsEl.classList.remove('hidden');
            if (this.messagesEl) this.messagesEl.classList.add('hidden');
            if (this.inputArea) this.inputArea.classList.add('hidden');
            if (this.loadingEl) this.loadingEl.classList.remove('hidden');

            this.fetchConversations();
            this.pollingInterval = setInterval(() => this.fetchConversations(), 5000);
        }

        fetchConversations() {
            // CRITICAL: Only owner can fetch
            if (!this.isOwner) {
                // console.error('fetchConversations called by non-owner!');
                this.stopPolling();
                return;
            }

            fetch(this.routes.conversations, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(async res => {
                    // Check if response is JSON
                    const contentType = res.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        const text = await res.text();
                        // console.error('Non-JSON response:', text.substring(0, 200));
                        throw new Error(`Server returned non-JSON response (${res.status})`);
                    }

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                        return Promise.reject(new Error(errorData.error || errorData.message || `HTTP ${res.status}`));
                    }
                    return res.json();
                })
                .then(data => {
                    if (this.loadingEl) this.loadingEl.classList.add('hidden');
                    if (Array.isArray(data)) {
                        this.renderConversations(data);
                    } else {
                        // console.error('Invalid response format:', data);
                        if (this.conversationsEl) {
                            this.conversationsEl.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Error memuat percakapan</div>';
                        }
                    }
                })
                .catch(err => {
                    // console.error('Error fetching conversations:', err);
                    if (this.loadingEl) this.loadingEl.classList.add('hidden');
                    if (this.conversationsEl) {
                        const errorMsg = err.message || 'Gagal memuat percakapan';
                        this.conversationsEl.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${this.escapeHtml(errorMsg)}</div>`;
                    }
                });
        }

        renderConversations(conversations) {
            if (!this.conversationsEl) return;

            this.conversationsEl.innerHTML = '';

            if (!Array.isArray(conversations)) {
                // console.error('conversations is not an array:', conversations);
                this.conversationsEl.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Format data tidak valid</div>';
                return;
            }

            if (conversations.length === 0) {
                this.conversationsEl.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">Belum ada percakapan</div>';
                return;
            }

            conversations.forEach(chat => {
                const el = document.createElement('div');
                el.className = 'p-3 border-b border-gray-100 hover:bg-white cursor-pointer transition flex items-center gap-3';
                el.onclick = () => this.openChat(chat.user.id, chat.user.name);

                const avatar = chat.user.avatar || '/assets/images/profilefoto/default-profile.png';
                const defaultAvatar = '/assets/images/profilefoto/default-profile.png';

                el.innerHTML = `
                    <img src="${avatar}" class="w-10 h-10 rounded-full object-cover border border-gray-200" onerror="this.onerror=null; this.src='${defaultAvatar}'">
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-1">
                            <h4 class="font-semibold text-sm text-gray-900 truncate">${chat.user.name}</h4>
                            <span class="text-xs text-gray-500">${chat.last_time}</span>
                        </div>
                        <p class="text-xs text-gray-600 truncate">${chat.last_message}</p>
                    </div>
                    ${chat.unread_count > 0 ? `<span class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">${chat.unread_count}</span>` : ''}
                `;
                this.conversationsEl.appendChild(el);
            });
        }

        openChat(targetId, targetName) {
            if (!targetId) {
                // console.error('Target ID is required');
                return;
            }

            

            this.stopPolling();
            this.currentTargetUserId = targetId;

            if (this.titleEl) this.titleEl.textContent = targetName;
            if (this.conversationsEl) this.conversationsEl.classList.add('hidden');
            if (this.messagesEl) {
                this.messagesEl.classList.remove('hidden');
                this.messagesEl.innerHTML = '';
            }
            if (this.inputArea) {
                this.inputArea.classList.remove('hidden');
                // Ensure input area is clickable
                this.inputArea.style.pointerEvents = 'auto';
                this.inputArea.style.zIndex = '99999';
                this.inputArea.style.position = 'relative';
                
                // Focus input after a short delay to ensure it's visible
                setTimeout(() => {
                    const input = this.inputArea.querySelector('input[name="message"]') || 
                                  this.inputArea.querySelector('#chat-message-input');
                    if (input) {
                        // Remove any attributes that might block interaction
                        input.removeAttribute('readonly');
                        input.removeAttribute('disabled');
                        input.style.pointerEvents = 'auto';
                        input.style.cursor = 'text';
                        input.style.opacity = '1';
                        input.style.position = 'relative';
                        input.style.zIndex = '100000';
                        
                        // Ensure form is also clickable
                        const form = this.inputArea.querySelector('form');
                        if (form) {
                            form.style.pointerEvents = 'auto';
                        }
                        
                        // Try to focus
                        try {
                            input.focus();
                        } catch (e) {
                            // console.warn('Could not focus input:', e);
                        }
                        
                        // Add click handler if not already added
                        if (!input.hasAttribute('data-chat-input-initialized')) {
                            input.setAttribute('data-chat-input-initialized', 'true');
                            input.addEventListener('click', function(e) {
                                e.stopPropagation();
                                e.preventDefault();
                                this.removeAttribute('readonly');
                                this.focus();
                            });
                            
                            // Also add mousedown to ensure it works
                            input.addEventListener('mousedown', function(e) {
                                e.stopPropagation();
                                this.removeAttribute('readonly');
                            });
                        }
                    } else {
                        // console.error('Input element not found in chat input area');
                    }
                }, 100);
            }
            if (this.loadingEl) this.loadingEl.classList.remove('hidden');

            // Back button
            if (this.isOwner && this.backBtn) {
                this.backBtn.classList.remove('hidden');
            } else if (this.backBtn) {
                this.backBtn.classList.add('hidden');
            }

            this.loadMessages();
            this.pollingInterval = setInterval(() => this.loadMessages(), 3000);
            
            // Update badge when opening chat (messages will be marked as read)
            setTimeout(() => this.updateUnreadBadge(), 1000);
        }

        loadMessages() {
            if (!this.currentTargetUserId) {
                // console.error('currentTargetUserId is not set');
                return;
            }

            const url = `${this.routes.messages}?user_id=${this.currentTargetUserId}`;

            fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(async res => {
                    // Check if response is JSON
                    const contentType = res.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        const text = await res.text();
                        // console.error('Non-JSON response:', text.substring(0, 200));
                        throw new Error(`Server returned non-JSON response (${res.status})`);
                    }

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                        return Promise.reject(new Error(errorData.error || errorData.message || `HTTP ${res.status}`));
                    }
                    return res.json();
                })
                .then(data => {
                    if (this.loadingEl) this.loadingEl.classList.add('hidden');
                    if (Array.isArray(data)) {
                        this.renderMessages(data);
                    } else {
                        // console.error('Invalid messages format:', data);
                        if (this.messagesEl) {
                            this.messagesEl.innerHTML = '<div class="p-4 text-center text-red-500 text-sm">Format data tidak valid</div>';
                        }
                    }
                })
                .catch(err => {
                    // console.error('Error loading messages:', err);
                    if (this.loadingEl) this.loadingEl.classList.add('hidden');
                    if (this.messagesEl) {
                        const errorMsg = err.message || 'Gagal memuat pesan';
                        this.messagesEl.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${this.escapeHtml(errorMsg)}</div>`;
                    }
                });
        }

        renderMessages(messages) {
            if (!this.messagesEl || !Array.isArray(messages)) {
                // console.error('Invalid messages data');
                return;
            }

            this.messagesEl.innerHTML = '';

            if (messages.length === 0) {
                this.messagesEl.innerHTML = '<div class="text-center text-gray-400 text-xs py-4">Belum ada pesan. Mulai percakapan!</div>';
                return;
            }

            let lastDate = null;

            messages.forEach(msg => {
                const isMe = String(msg.sender_id) === this.userId;
                const date = new Date(msg.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                if (date !== lastDate) {
                    const dateDiv = document.createElement('div');
                    dateDiv.className = 'text-center text-xs text-gray-400 my-2';
                    dateDiv.textContent = date;
                    this.messagesEl.appendChild(dateDiv);
                    lastDate = date;
                }

                const wrapper = document.createElement('div');
                wrapper.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`;

                const bubble = document.createElement('div');
                bubble.className = `max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    isMe
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`;

                const time = new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                bubble.innerHTML = `
                    <p class="break-words">${this.escapeHtml(msg.message)}</p>
                    <div class="text-[10px] ${isMe ? 'text-indigo-200' : 'text-gray-400'} text-right mt-1 flex items-center justify-end gap-1">
                        ${time}
                        ${isMe ? (
                            msg.is_read
                                ? '<i class="fas fa-check-double"></i>'
                                : '<i class="fas fa-check"></i>'
                        ) : ''}
                    </div>
                `;

                wrapper.appendChild(bubble);
                this.messagesEl.appendChild(wrapper);
            });

            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }

        handleSubmit(e) {
            e.preventDefault();
            const input = e.target.elements.message || e.target.querySelector('input[name="message"]');
            if (!input) {
                // console.error('Input element not found');
                return;
            }
            
            const msg = input.value.trim();
            if (!msg) return;

            if (!this.currentTargetUserId) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Perhatian',
                        text: 'Silakan pilih percakapan terlebih dahulu',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
            if (btn) {
                input.disabled = true;
                btn.disabled = true;
            }

            fetch(this.routes.send, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': this.csrfToken
                },
                body: JSON.stringify({
                    message: msg,
                    target_user_id: this.currentTargetUserId
                })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => Promise.reject(err));
                }
                return res.json();
            })
            .then(data => {
                if (input) {
                    input.value = '';
                    input.disabled = false;
                    input.focus();
                }
                if (btn) btn.disabled = false;
                this.loadMessages();
                // Update badge after sending message
                setTimeout(() => this.updateUnreadBadge(), 500);
            })
            .catch(err => {
                // console.error('Error sending message:', err);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Gagal',
                        text: err.message || 'Gagal mengirim pesan. Silakan coba lagi.',
                        icon: 'error',
                        confirmButtonColor: '#E02424'
                    });
                } else {
                    alert(err.message || 'Gagal mengirim pesan. Silakan coba lagi.');
                }
                if (input) input.disabled = false;
                if (btn) btn.disabled = false;
            });
        }

        stopPolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
        }

        startUnreadPolling() {
            // Check unread count every 5 seconds
            this.updateUnreadBadge();
            this.unreadPollingInterval = setInterval(() => this.updateUnreadBadge(), 5000);
        }

        stopUnreadPolling() {
            if (this.unreadPollingInterval) {
                clearInterval(this.unreadPollingInterval);
                this.unreadPollingInterval = null;
            }
        }

        updateUnreadBadge() {
            if (!this.routes.unreadCount) {
                // console.warn('Unread count route not configured');
                return;
            }

            fetch(this.routes.unreadCount, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(async res => {
                    if (!res.ok) {
                        return Promise.reject(new Error(`HTTP ${res.status}`));
                    }
                    return res.json();
                })
                .then(data => {
                    const count = data.unread_count || 0;
                    this.setBadge(count);
                })
                .catch(err => {
                    // console.error('Error fetching unread count:', err);
                });
        }

        setBadge(count) {
            if (!this.badge) return;

            if (count > 0) {
                this.badge.textContent = count > 99 ? '99+' : count.toString();
                this.badge.classList.remove('hidden');
            } else {
                this.badge.classList.add('hidden');
            }
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (window.activityChatConfig) {
                new ActivityChat(window.activityChatConfig);
            }
        });
    } else {
        if (window.activityChatConfig) {
            new ActivityChat(window.activityChatConfig);
        }
    }

    // Export for global access
    window.ActivityChat = ActivityChat;
})();
