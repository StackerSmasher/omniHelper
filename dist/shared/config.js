// Create a global namespace for the extension to avoid polluting the window object.
window.OmniHelper = window.OmniHelper || {};

// In the future, we can store shared configuration here.
OmniHelper.config = {
    // Example: API endpoints, feature flags, etc.
    AUTO_RESPONSE_ENDPOINT: 'https://omnichat.rt.ru/core/messages/send-agent-message',
    AUTO_RESPONSE_TEXT: 'Добрый день! Запрос принят в работу. Пожалуйста, не покидайте чат и оставайтесь на связи.',
    AUTO_RESPONSE_TEMPLATE_ID: 5103
};
