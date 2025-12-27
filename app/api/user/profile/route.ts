import { NextRequest, NextResponse } from 'next/server';

/**
 * 用户信息 API
 *
 * GET /api/user/profile - 获取用户信息
 * PUT /api/user/profile - 更新用户信息
 */

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscription: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    defaultAIProvider: 'gemini' | 'deepseek';
    defaultModel?: string;
  };
}

interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
  preferences?: Partial<UserProfile['preferences']>;
}

interface ProfileResponse {
  success: boolean;
  profile?: UserProfile;
  error?: string;
}

// 开发模式下的模拟用户数据
const mockUserProfile: UserProfile = {
  id: 'dev-user-001',
  email: 'dev@documind.local',
  name: '开发者',
  subscription: 'pro',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  preferences: {
    theme: 'system',
    language: 'zh-CN',
    defaultAIProvider: 'deepseek',
    defaultModel: 'deepseek-chat',
  },
};

/**
 * GET - 获取用户信息
 */
export async function GET(): Promise<NextResponse<ProfileResponse>> {
  try {
    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

    if (devMode) {
      // 开发模式：返回模拟用户信息
      return NextResponse.json({
        success: true,
        profile: mockUserProfile,
      });
    }

    // 生产模式：从认证系统获取用户信息
    // TODO: 集成 NextAuth session
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  } catch (error) {
    console.error('[Profile API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取用户信息失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT - 更新用户信息
 */
export async function PUT(request: NextRequest): Promise<NextResponse<ProfileResponse>> {
  try {
    const body: UpdateProfileRequest = await request.json();
    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

    if (devMode) {
      // 开发模式：更新模拟用户信息
      const updatedProfile: UserProfile = {
        ...mockUserProfile,
        ...body,
        preferences: {
          ...mockUserProfile.preferences,
          ...(body.preferences || {}),
        },
        updatedAt: new Date().toISOString(),
      };

      // 更新全局模拟数据
      Object.assign(mockUserProfile, updatedProfile);

      return NextResponse.json({
        success: true,
        profile: updatedProfile,
      });
    }

    // 生产模式：更新数据库中的用户信息
    // TODO: 集成 Supabase
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  } catch (error) {
    console.error('[Profile API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新用户信息失败' },
      { status: 500 }
    );
  }
}
