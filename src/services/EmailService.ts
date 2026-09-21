export interface EmailReportItem {
  supplier: string;
  value: number;
  dueDate: string;
  daysOverdue?: number;
  daysUntilDue?: number;
  status?: string;
  category?: string;
  partialAmountPaid?: number;
}

export interface SendDirectEmailOptions {
  to?: string | string[];
  subject: string;
  body: string;
  html?: string;
  storeName: string;
  reportType: 'overdue' | 'paid_month' | 'upcoming' | 'general';
  items?: EmailReportItem[];
  totalValue?: number;
  count?: number;
}

export class EmailService {
  /**
   * Generates an executive, professional HTML email report template
   */
  static generateHtmlReport(options: {
    title: string;
    storeName: string;
    type: 'overdue' | 'paid_month' | 'upcoming' | 'general';
    items: EmailReportItem[];
    totalValue: number;
    count: number;
    extraNote?: string;
  }): string {
    const fmt = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const isOverdue = options.type === 'overdue';
    const isPaid = options.type === 'paid_month';

    const headerBg = isOverdue ? '#dc2626' : isPaid ? '#16a34a' : '#2563eb';
    const badgeText = isOverdue ? 'CRÍTICO / ATRASADO' : isPaid ? 'CONFIRMADO / PAGO' : 'COMPROMISSOS FUTUROS';

    const rows = options.items.slice(0, 100).map((item, idx) => {
      const remaining = item.value - (item.partialAmountPaid || 0);
      const valToShow = isPaid ? (item.partialAmountPaid || item.value) : remaining;
      const dateShow = item.dueDate.includes('-')
        ? item.dueDate.split('-').reverse().join('/')
        : item.dueDate;

      let detailText = '';
      if (isOverdue && item.daysOverdue !== undefined) {
        detailText = `<span style="color: #dc2626; font-weight: bold;">${item.daysOverdue} dias de atraso</span>`;
      } else if (isPaid) {
        detailText = `<span style="color: #16a34a; font-weight: bold;">Liquidado</span>`;
      } else if (item.daysUntilDue !== undefined) {
        detailText = `<span>Vence em ${item.daysUntilDue} dias</span>`;
      }

      const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

      return `
        <tr style="background-color: ${bgRow}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-size: 13px; color: #1e293b; font-weight: 600;">${idx + 1}. ${item.supplier}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: #475569; text-align: center;">${dateShow}</td>
          <td style="padding: 10px 12px; font-size: 13px; text-align: center;">${detailText}</td>
          <td style="padding: 10px 12px; font-size: 14px; font-weight: bold; color: #0f172a; text-align: right;">${fmt(valToShow)}</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${options.title}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background-color: ${headerBg}; padding: 24px; color: #ffffff; text-align: left;">
      <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.9; font-weight: 700; margin-bottom: 4px;">GRUPO AZEVEDO ALIMENTOS • GESTÃO FINANCEIRA</div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.3;">${options.title}</h1>
      <div style="margin-top: 8px; display: inline-block; background-color: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">
        ${options.storeName.toUpperCase()}
      </div>
    </div>

    <!-- Summary Box -->
    <div style="padding: 20px 24px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">TOTAL CONSOLIDADO</div>
          <div style="font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 2px;">${fmt(options.totalValue)}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">REGISTROS</div>
          <div style="font-size: 18px; font-weight: 800; color: #334155; margin-top: 2px;">${options.count} boleto(s)</div>
        </div>
      </div>
    </div>

    <!-- Content Table -->
    <div style="padding: 24px;">
      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Fornecedor</th>
            <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Vencimento</th>
            <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Status</th>
            <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
      Relatório gerado eletronicamente pelo Sistema de Gestão do Grupo Azevedo em ${dateFormatted} às ${timeFormatted}.<br>
      Destinatários: Rennaninacio0003@gmail.com, azevedogas@yahoo.com.br
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Sends email directly via backend API without opening external mail client
   */
  static async sendDirectEmail(options: SendDirectEmailOptions): Promise<{
    success: boolean;
    message: string;
    previewUrl?: string;
    delivered?: boolean;
    simulated?: boolean;
  }> {
    const recipients = options.to || "rennaninacio0003@gmail.com,azevedogas@yahoo.com.br";

    let html = options.html;
    if (!html && options.items && options.totalValue !== undefined) {
      html = this.generateHtmlReport({
        title: options.subject,
        storeName: options.storeName,
        type: options.reportType,
        items: options.items,
        totalValue: options.totalValue,
        count: options.count || options.items.length,
      });
    }

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipients,
        subject: options.subject,
        text: options.body,
        html: html || undefined,
        storeName: options.storeName,
        reportType: options.reportType,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Falha no envio do e-mail (HTTP ${response.status})`);
    }

    return data;
  }
}
