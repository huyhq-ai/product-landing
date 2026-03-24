/* chatbot.js - AI Chatbot Logic */
document.addEventListener('DOMContentLoaded', () => {
    // === Cấu hình OpenRouter ===
    const API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const API_KEY = "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";
    const MODEL = "z-ai/glm-4.5-air:free";
    
    // === Variables ===
    let messages = [];
    let systemPromptBase = "";
    let isWaitingForResponse = false;
  
    // === DOM Elements ===
    const chatbotWidget = document.getElementById('smart-chatbot-widget');
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const closeBtn = document.getElementById('cb-close-btn');
    const refreshBtn = document.getElementById('cb-refresh-btn');
    const messagesContainer = document.getElementById('cb-messages');
    const chatInput = document.getElementById('cb-input');
    const sendBtn = document.getElementById('cb-send-btn');
    const typingIndicator = document.getElementById('cb-typing');
  
    // Tải Knowledge Base từ chatbot_data.txt
    async function loadKnowledgeBase() {
      try {
        const resp = await fetch('chatbot_data.txt');
        if (resp.ok) {
          const text = await resp.text();
          systemPromptBase = `Đóng vai: Trợ lý AI độc quyền của chuyên gia Nguyễn Văn A.
  
  KNOWLEDGE BASE:
  ${text}
  
  QUY TẮC BẮT BUỘC:
  1. Chỉ được trả lời dựa trên Knowledge Base đã cung cấp. Không được phép tự bịa đặt hay sử dụng thông tin bên ngoài.
  2. Bắt buộc format câu trả lời bằng Markdown (dùng dấu * hoặc - cho list, dùng in đậm cho key word).
  3. Luôn luôn:
     - Chào thân thiện ở tin nhắn đầu tiên hoặc khi câu hỏi mang tính chất bắt chuyện.
     - Trả lời rõ ràng, dễ hiểu, chuyên nghiệp nhưng vẫn "human".
     - Kết thúc bằng lời mời hỏi thêm thông tin hoặc lời kêu gọi hành động (Call to action).
  4. Nếu khách hàng hỏi thông tin NẰM NGOÀI phạm vi Knowledge Base -> Từ chối nhẹ nhàng lịch sự và hướng dẫn liên hệ trực tiếp qua thông tin có sẵn.
  `;
        } else {
          console.warn("Không thể tải knowledge base (Lỗi 404).");
          setFallbackPrompt();
        }
      } catch (err) {
        console.warn("Lỗi tải knowledge base: ", err);
        setFallbackPrompt();
      }
      
      initChat();
    }
  
    function setFallbackPrompt() {
      systemPromptBase = "Bạn là trợ lý AI. Hãy trả lời ngắn gọn, format bằng markdown.";
    }
  
    // Bắt đầu hoặc làm mới cuộc trò chuyện
    function initChat() {
      // Xóa lịch sử (Trừ typing indicator)
      while (messagesContainer.firstChild) {
          if (messagesContainer.firstChild !== typingIndicator) {
              messagesContainer.removeChild(messagesContainer.firstChild);
          } else {
              break;
          }
      }
      
      messages = [
        { role: 'system', content: systemPromptBase }
      ];
      
      showGreeting();
    }
  
    function showGreeting() {
      appendMessage('bot', "Xin chào! 👋 Tôi là trợ lý AI của Alchemist.Dev. Bạn cần tư vấn về giải pháp Hệ thống tự động hóa, thiết bị công nghệ mới hay mong muốn hợp tác phát triển sản phẩm?");
    }
  
    // UI Event Listeners
    function toggleChat() {
      chatbotWidget.classList.toggle('active');
      if (chatbotWidget.classList.contains('active')) {
        chatInput.focus();
      }
    }
  
    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
  
    // Logic nút Refresh
    refreshBtn.addEventListener('click', () => {
      // 1. Icon refresh animation
      const icon = refreshBtn.querySelector('.material-symbols-outlined');
      icon.classList.add('spin-animation');
      
      // 4. Dừng animation sau 500ms
      setTimeout(() => {
        icon.classList.remove('spin-animation');
      }, 500);
  
      // 2. Clear history & 3. Gửi lại lời chào mặc định
      initChat();
    });
  
    // Xử lý gửi tin nhắn
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !isWaitingForResponse) {
        handleSend();
      }
    });
  
    sendBtn.addEventListener('click', () => {
      if (!isWaitingForResponse) {
        handleSend();
      }
    });
  
    async function handleSend() {
      const text = chatInput.value.trim();
      if (!text) return;
  
      // Clear input
      chatInput.value = '';
      
      // Add and append user message
      messages.push({ role: 'user', content: text });
      appendMessage('user', text);
      
      // Update UI state
      showTyping();
      isWaitingForResponse = true;
      sendBtn.disabled = true;
  
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "HTTP-Referer": window.location.href, // Required for OpenRouter
            "X-Title": "Alchemist.Dev Chatbot",   // App Name
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: MODEL,
            messages: messages,
            temperature: 0.7
          })
        });
  
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
  
        const data = await response.json();
        const botReply = data.choices[0].message.content;
  
        // Xóa typing & lưu log
        hideTyping();
        messages.push({ role: 'assistant', content: botReply });
        appendMessage('bot', botReply);
  
      } catch (error) {
        console.error("OpenRouter API Error:", error);
        hideTyping();
        appendMessage('bot', "Xin lỗi, hiện tại tôi đang gặp sự cố kết nối. Vui lòng gửi email trực tiếp qua `a@example.com` nhé!");
        // Remove failing user message from history if needed
        messages.pop();
      } finally {
        isWaitingForResponse = false;
        sendBtn.disabled = false;
        chatInput.focus();
      }
    }
  
    // Append message to UI
    function appendMessage(sender, text) {
      const wrapper = document.createElement('div');
      wrapper.className = `msg-wrapper msg-${sender}`;
      
      if (sender === 'bot') {
        const mdDiv = document.createElement('div');
        mdDiv.className = 'chat-markdown';
        // Render Markdown content (Bắt buộc dùng marked.js)
        if (window.marked) {
          mdDiv.innerHTML = marked.parse(text);
        } else {
          // Fallback if marked is missing
          mdDiv.innerText = text; 
        }
        wrapper.appendChild(mdDiv);
      } else {
        const textSpan = document.createElement('span');
        textSpan.innerText = text;
        wrapper.appendChild(textSpan);
      }
  
      // Insert BEFORE typing indicator to maintain it at bottom
      messagesContainer.insertBefore(wrapper, typingIndicator);
      scrollToBottom();
    }
  
    function showTyping() {
      typingIndicator.style.display = 'flex';
      scrollToBottom();
    }
  
    function hideTyping() {
       typingIndicator.style.display = 'none';
    }
  
    function scrollToBottom() {
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
    }
  
    // Khởi tạo
    loadKnowledgeBase();
  });
