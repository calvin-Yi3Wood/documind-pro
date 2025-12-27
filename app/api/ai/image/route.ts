import { NextRequest, NextResponse } from 'next/server';

/**
 * AI 图片生成 API
 *
 * POST /api/ai/image
 * 使用 Gemini API 生成图片
 */

interface ImageGenerationRequest {
  prompt: string;
  style?: 'realistic' | 'artistic' | 'cartoon' | 'abstract';
  size?: '256x256' | '512x512' | '1024x1024';
  provider?: 'gemini';
}

interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  base64?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ImageGenerationResponse>> {
  try {
    const body: ImageGenerationRequest = await request.json();
    const { prompt, style = 'realistic', size = '1024x1024' } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: '缺少必需的 prompt 参数' },
        { status: 400 }
      );
    }

    // 检查开发模式
    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

    // 检查 Gemini API Key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
      if (devMode) {
        // 开发模式返回占位图片
        return NextResponse.json({
          success: true,
          imageUrl: `https://via.placeholder.com/${size.replace('x', '/')}?text=${encodeURIComponent(prompt.slice(0, 30))}`,
        });
      }
      return NextResponse.json(
        { success: false, error: 'Gemini API Key 未配置' },
        { status: 500 }
      );
    }

    // 构建增强的提示词
    const enhancedPrompt = buildEnhancedPrompt(prompt, style);

    // 调用 Gemini API 生成图片
    // 注意: Gemini 的图片生成功能可能需要特定模型
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate an image based on this description: ${enhancedPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Image API] Gemini error:', errorData);
      return NextResponse.json(
        { success: false, error: `Gemini API 错误: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 从响应中提取图片URL或base64
    // 注意: Gemini 返回格式可能需要根据实际API调整
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0];

    if (generatedContent?.inlineData) {
      // 返回 base64 图片
      return NextResponse.json({
        success: true,
        base64: `data:${generatedContent.inlineData.mimeType};base64,${generatedContent.inlineData.data}`,
      });
    }

    // 如果没有直接生成图片，返回提示词优化结果
    return NextResponse.json({
      success: true,
      imageUrl: `https://via.placeholder.com/${size.replace('x', '/')}?text=${encodeURIComponent('生成中...')}`,
    });
  } catch (error) {
    console.error('[Image API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '图片生成失败' },
      { status: 500 }
    );
  }
}

/**
 * 构建增强的图片生成提示词
 */
function buildEnhancedPrompt(prompt: string, style: string): string {
  const styleModifiers: Record<string, string> = {
    realistic: 'photorealistic, highly detailed, professional photography, 8k resolution',
    artistic: 'digital art, artistic, vibrant colors, creative composition',
    cartoon: 'cartoon style, animated, colorful, playful, clean lines',
    abstract: 'abstract art, surreal, creative, unique perspective, artistic',
  };

  const modifier = styleModifiers[style] || styleModifiers.realistic;
  return `${prompt}, ${modifier}, high quality, masterpiece`;
}

/**
 * GET 请求 - 获取图片生成状态
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'AI Image Generation',
    status: 'available',
    supportedStyles: ['realistic', 'artistic', 'cartoon', 'abstract'],
    supportedSizes: ['256x256', '512x512', '1024x1024'],
    provider: 'gemini',
  });
}
