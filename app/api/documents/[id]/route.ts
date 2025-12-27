import { NextRequest, NextResponse } from 'next/server';

/**
 * 单文档操作 API
 *
 * GET /api/documents/[id] - 获取单个文档
 * PUT /api/documents/[id] - 更新文档
 * DELETE /api/documents/[id] - 删除文档
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

interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

interface DocumentResponse {
  success: boolean;
  document?: Document;
  error?: string;
}

// 模拟数据存储（与 route.ts 共享）
const mockDocuments: Map<string, Document> = new Map();

/**
 * GET - 获取单个文档
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DocumentResponse>> {
  try {
    const { id } = await params;

    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

    if (devMode) {
      const document = mockDocuments.get(id);
      if (!document) {
        return NextResponse.json({ success: false, error: '文档不存在' }, { status: 404 });
      }
      return NextResponse.json({ success: true, document });
    }

    // 生产模式：从 Supabase 获取
    // TODO: 实现 Supabase 集成
    return NextResponse.json({ success: false, error: '文档不存在' }, { status: 404 });
  } catch (error) {
    console.error('[Documents API] GET [id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取文档失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT - 更新文档
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DocumentResponse>> {
  try {
    const { id } = await params;
    const body: UpdateDocumentRequest = await request.json();

    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

    if (devMode) {
      const existingDoc = mockDocuments.get(id);
      if (!existingDoc) {
        return NextResponse.json({ success: false, error: '文档不存在' }, { status: 404 });
      }

      const updatedDocument: Document = {
        ...existingDoc,
        ...body,
        updatedAt: new Date().toISOString(),
        version: existingDoc.version + 1,
      };

      mockDocuments.set(id, updatedDocument);
      return NextResponse.json({ success: true, document: updatedDocument });
    }

    // 生产模式：更新 Supabase
    // TODO: 实现 Supabase 集成
    return NextResponse.json({ success: false, error: '文档不存在' }, { status: 404 });
  } catch (error) {
    console.error('[Documents API] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新文档失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 删除文档
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const { id } = await params;

    const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

    if (devMode) {
      if (!mockDocuments.has(id)) {
        return NextResponse.json({ success: false, error: '文档不存在' }, { status: 404 });
      }
      mockDocuments.delete(id);
      return NextResponse.json({ success: true });
    }

    // 生产模式：从 Supabase 删除
    // TODO: 实现 Supabase 集成
    return NextResponse.json({ success: false, error: '文档不存在' }, { status: 404 });
  } catch (error) {
    console.error('[Documents API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除文档失败' },
      { status: 500 }
    );
  }
}
