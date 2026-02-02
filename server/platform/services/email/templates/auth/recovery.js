export function template (username, link) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Recovery</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                color: #343a40;
                margin: 0;
                padding: 0;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #f4f4f4;
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
                color: #343a40;
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
                color: #f4f4f4;
                background-color: #343a40;
                text-decoration: none;
                border-radius: 0px;
                text-align: center;

            }
            a:visited {
                color: #f4f4f4; /* Change to your desired color */
            }
            .footer {
                text-align: center;
                padding: 10px 0;
                border-top: 1px solid #eeeeee;
                font-size: 12px;
                color: #adb5bd;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Restablecer tu contraseña</h2>
            </div>
            <div class="content">
                <p>¡Hola ${username}!,</p>
                <p>Recibimos un pedido para restablecer tu contraseña. Para eso hac[e click en el botón de abajo:</p>
                <a href="${link}" style="color: #f4f4f4; text-decoration: none;" class="btn">Restablecer tu contraseña</a>
                <p>Si vos no quisiste restablecer tu contraseña, por favor ignorá este mensaje.</p>
                <p>¡Gracias!,<br>El esquipo de Fisco Manager</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()}. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `
}
