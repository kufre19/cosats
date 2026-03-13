const http = require('http');


async function sendMesageToModel(message) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    }
    const body = {
        model: 'gpt-4o-mini',
        messages: [{role: 'user', content: message}]
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    const data = await response.json();
    return data;
}

module.exports = {
    sendMesageToModel
}