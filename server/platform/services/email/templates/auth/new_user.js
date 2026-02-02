export function template (greeting, message, username, linkUrl, linkLabel) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${greeting}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                color: #333333;
                margin: 0;
                padding: 0;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 20px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
            }
            .header {
                text-align: center;
                padding: 10px 0;
                border-bottom: 1px solid #eeeeee;
            }
            .header h1 {
                margin: 0;
                color: #4CAF50;
            }
            .content {
                padding: 20px;
                text-align: left;
            }
            .content p {
                margin: 0 0 15px;
            }
            .btn {
                display: inline-block;
                padding: 10px 20px;
                margin: 20px 0;
                font-size: 16px;
                color: #ffffff;
                background-color: #4CAF50;
                text-decoration: none;
                border-radius: 5px;
                text-align: center;
            }
            .footer {
                text-align: center;
                padding: 10px 0;
                border-top: 1px solid #eeeeee;
                font-size: 12px;
                color: #777777;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${greeting}</h1>
            </div>
            <div class="content">
                <p><strong>${username}</strong></p>
                <p>${message}</p>
                <a href="${linkUrl}" class="btn">${linkLabel}</a>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `
}
