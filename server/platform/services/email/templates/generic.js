export function template ({
  title,
  message,
  logoUrl,
  ctaUrl,
  ctaLabel,
  unsubscribeUrl,
  openTrackingLinkUrl
}) {
  let html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>${title}</title>
    <style>
      @media only screen and (max-width: 600px) {
        table.container {
          width: 90% !important;
          padding: 20px !important;
        }
        td.title {
          font-size: 20px !important;
        }
        td.body-text {
          font-size: 15px !important;
        }
        a.cta-button {
          padding: 12px 20px !important;
          font-size: 16px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#f9fafb; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f9fafb; padding:40px 0; width:100%;">
      <tr>
        <td align="center">
          <!-- Container -->
          <table class="container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff; border-radius:12px; padding:40px; box-shadow:0 4px 12px rgba(0,0,0,0.05); max-width:600px; width:600px;">
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <img src="${logoUrl}" alt="Company Logo" width="128" style="display:block; max-width:100%;" />
              </td>
            </tr>
            <tr>
              <td class="title" style="font-size:24px; font-weight:bold; color:#212529; text-align:center; padding-bottom:20px;">
                ${title}
              </td>
            </tr>
            <tr>
              <td class="body-text" style="font-size:18px; color:#212529; line-height:1.6; padding-bottom:30px;">
                ${message}
              </td>
            </tr>`

  if (ctaUrl && ctaLabel) {
    html += `<tr>
              <td align="center" style="padding-bottom:40px;">
                <a href="${ctaUrl}" class="cta-button" style="background-color:#212529; color:#ffffff; text-decoration:none; font-weight:bold; padding:14px 28px; border-radius:0px; display:inline-block;">
                  ${ctaLabel}
                </a>
              </td>
            </tr>`
  }
  if (unsubscribeUrl) {
    html += `<tr>
                  <td style="font-size:14px; color:#9ca3af; text-align:center; line-height:1.4;">
                    You're receiving this email because you subscribed to our mailing list.  
                    <br><br>
                    <a href="${unsubscribeUrl}" style="color:#6b7280; text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>`
  }
  html += `</table>
          <!-- End Container -->
        </td>
      </tr>
    </table>
    `
  if (openTrackingLinkUrl) {
    html += `<img src="${openTrackingLinkUrl}" width="1" height="1" style="display:none;" />`
  }
  html += `
  </body>
</html>`

  return html
}
