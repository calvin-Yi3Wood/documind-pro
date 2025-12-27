import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

/**
 * 文档 CRUD API
 *
 * GET /api/documents - 获取文档列表
 * POST /api/documents - 创建新文档
 */

interface Document {
  id: string;
  title: string;
  content: string;
  userId: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  syncStatus: 'local' | 'synced' | 'syncing' | 'error';
  collaborators?: string[];
  tags?: string[];
}

interface CreateDocumentRequest {
  title: string;
  content?: string;
  projectId?: string;
  tags?: string[];
}

interface DocumentListResponse {
  success: boolean;
  documents?: Document[];
  total?: number;
  error?: string;
}

interface DocumentResponse {
  success: boolean;
  document?: Document;
  error?: string;
}

// 开发模式下的模拟数据存储
const mockDocuments: Map<string, Document> = new Map();

/**
 * GET - 获取文档列表
 */
export async function GET(request: NextRequest): Promise<NextResponse<DocumentListResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

    if (devMode) {
      // 开发模式：返回本地模拟数据
      let documents = Array.from(mockDocuments.values());

      // 按项目筛选
      if (projectId) {
        documents = documents.filter((doc) => doc.projectId === projectId);
      }

      // 分页
      const total = documents.length;
      documents = documents.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        documents,
        total,
      });
    }

    // 生产模式：从 Supabase 获取
    // TODO: 实现 Supabase 集成
    return NextResponse.json({
      success: true,
      documents: [],
      total: 0,
    });
  } catch (error) {
    console.error('[Documents API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取文档列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST - 创建新文档
 */
export async function POST(request: NextRequest): Promise<NextResponse<DocumentResponse>> {
  try {
    const body: CreateDocumentRequest = await request.json();
    const { title, content = '', projectId, tags = [] } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: '文档标题不能为空' }, { status: 400 });
    }

    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    const now = new Date().toISOString();

    const newDocument: Document = {
      id: nanoid(),
      title,
      content,
      userId: 'dev-user', // 开发模式下的默认用户
      ...(projectId !== undefined ? { projectId } : {}),
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: devMode ? 'local' : 'syncing',
      collaborators: [],
      tags,
    };

    if (devMode) {
      // 开发模式：保存到内存
      mockDocuments.set(newDocument.id, newDocument);
      return NextResponse.json({
        success: true,
        document: newDocument,
      });
    }

    // 生产模式：保存到 Supabase
    // TODO: 实现 Supabase 集成
    return NextResponse.json({
      success: true,
      document: newDocument,
    });
  } catch (error) {
    console.error('[Documents API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '创建文档失败' },
      { status: 500 }
    );
  }
}
