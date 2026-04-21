/**
 * 文件操作工具函数
 */

/**
 * 下载文本文件
 * @param content 文件内容
 * @param filename 文件名
 */
export function downloadFile(content: string, filename: string): void {
  // 输入验证
  if (!content || typeof content !== 'string') {
    throw new Error('文件内容不能为空且必须是字符串类型');
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('文件名不能为空且必须是字符串类型');
  }

  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`下载文件时出错: ${(error as Error).message}`);
  }
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 输入验证
  if (!text || typeof text !== 'string') {
    throw new Error('要复制的文本不能为空且必须是字符串类型');
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      return false;
    }
  }
}
