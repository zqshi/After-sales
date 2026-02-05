import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeController } from '@presentation/http/controllers/KnowledgeController';
import { TaxKBError } from '@infrastructure/adapters/TaxKBAdapter';

const makeReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
});

describe('KnowledgeController', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('creates knowledge item with owner metadata', async () => {
    const createUseCase = { execute: vi.fn().mockResolvedValue({ id: 'k1' }) };
    const controller = new KnowledgeController(
      createUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const reply = makeReply();

    await controller.create(
      { body: { title: 'T', content: 'C', category: 'faq', source: 'manual' }, user: { name: 'Owner' } } as any,
      reply as any,
    );

    expect(createUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ owner: 'Owner' }) }),
    );
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('keeps existing owner metadata when provided', async () => {
    const createUseCase = { execute: vi.fn().mockResolvedValue({ id: 'k1' }) };
    const controller = new KnowledgeController(
      createUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const reply = makeReply();

    await controller.create(
      {
        body: { title: 'T', content: 'C', category: 'faq', source: 'manual', metadata: { owner: 'Existing' } },
        user: { name: 'Owner' },
      } as any,
      reply as any,
    );

    expect(createUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ owner: 'Existing' }) }),
    );
  });

  it('lists knowledge items with parsed query', async () => {
    const listUseCase = { execute: vi.fn().mockResolvedValue([]) };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      listUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const reply = makeReply();

    await controller.list(
      { query: { page: '2', limit: '10', category: 'faq', query: 'tax' } } as any,
      reply as any,
    );

    expect(listUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10, category: 'faq', query: 'tax' }),
    );
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('deletes knowledge item with deleteRelatedFaq flag', async () => {
    const deleteUseCase = { execute: vi.fn().mockResolvedValue(undefined) };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      deleteUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const reply = makeReply();

    await controller.delete(
      { params: { id: 'k1' }, query: { deleteRelatedFaq: 'true' } } as any,
      reply as any,
    );

    expect(deleteUseCase.execute).toHaveBeenCalledWith({ knowledgeId: 'k1', deleteRelatedFaq: true });
    expect(reply.code).toHaveBeenCalledWith(204);
  });

  it('returns validation error when upload has no file', async () => {
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const reply = makeReply();
    const request = {
      file: vi.fn().mockResolvedValue(null),
      body: {},
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send.mock.calls[0][0].error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts upload when TaxKB disabled', async () => {
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(false) } as any,
    );
    const reply = makeReply();
    const request = {
      file: vi.fn().mockResolvedValue({ filename: 'doc.txt', toBuffer: vi.fn().mockResolvedValue(Buffer.from('x')) }),
      body: {},
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(202);
    expect(reply.send.mock.calls[0][0].data.docId).toBeTruthy();
  });

  it('uploads when TaxKB enabled', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockResolvedValue('doc-1') };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      file: vi.fn().mockResolvedValue({ filename: 'doc.txt', toBuffer: vi.fn().mockResolvedValue(Buffer.from('x')) }),
      body: { category: 'faq' },
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(uploadDocumentUseCase.execute).toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('handles TaxKB duplicate uploads', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockRejectedValue(
      new TaxKBError('exists', 409, { detail: { existing_doc: { doc_id: 'doc-9', status: 'active' } } }),
    ) };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      file: vi.fn().mockResolvedValue({ filename: 'doc.txt', toBuffer: vi.fn().mockResolvedValue(Buffer.from('x')) }),
      body: {},
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(200);
    expect(reply.send.mock.calls[0][0].data.docId).toBe('doc-9');
  });

  it('reports progress when TaxKB enabled/disabled', async () => {
    const adapterEnabled = { isEnabled: vi.fn().mockReturnValue(true), getProcessingProgress: vi.fn().mockResolvedValue({ overall_status: 'processing', overall_progress: 50, tasks: [] }) };
    const adapterDisabled = { isEnabled: vi.fn().mockReturnValue(false) };

    const controllerEnabled = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      adapterEnabled as any,
    );
    const controllerDisabled = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      adapterDisabled as any,
    );
    const replyEnabled = makeReply();
    const replyDisabled = makeReply();

    await controllerDisabled.getProgress({ params: { id: 'doc-1' } } as any, replyDisabled as any);
    await controllerEnabled.getProgress({ params: { id: 'doc-1' } } as any, replyEnabled as any);

    expect(replyDisabled.code).toHaveBeenCalledWith(200);
    expect(replyEnabled.code).toHaveBeenCalledWith(200);
  });

  it('maps not found and invalid errors', async () => {
    const getUseCase = { execute: vi.fn().mockRejectedValue(new Error('not found')) };
    const updateUseCase = { execute: vi.fn().mockRejectedValue(new Error('invalid payload')) };
    const controller = new KnowledgeController(
      {} as any,
      getUseCase as any,
      {} as any,
      updateUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const replyGet = makeReply();
    const replyUpdate = makeReply();

    await controller.get({ params: { id: 'k1' } } as any, replyGet as any);
    await controller.update({ params: { id: 'k1' }, body: {} } as any, replyUpdate as any);

    expect(replyGet.code).toHaveBeenCalledWith(404);
    expect(replyUpdate.code).toHaveBeenCalledWith(400);
  });

  it('handles error with statusCode and details', async () => {
    const createUseCase = { execute: vi.fn().mockRejectedValue(Object.assign(new Error('oops'), { statusCode: 422, details: { message: 'required field' } })) };
    const controller = new KnowledgeController(
      createUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const reply = makeReply();

    await controller.create({ body: { title: 't', content: 'c', category: 'faq', source: 'x' }, user: {} } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(422);
    expect(reply.send.mock.calls[0][0].error.code).toBe('VALIDATION_ERROR');
  });

  it('returns internal error for non-Error', async () => {
    const listUseCase = { execute: vi.fn().mockRejectedValue('boom') };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      listUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const reply = makeReply();

    await controller.list({ query: {} } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  it('searches knowledge items', async () => {
    const searchUseCase = { execute: vi.fn().mockResolvedValue([{ id: 'k1' }]) };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      searchUseCase as any,
      {} as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn() } as any,
    );
    const reply = makeReply();

    await controller.search({ body: { query: 'test' } } as any, reply as any);

    expect(searchUseCase.execute).toHaveBeenCalledWith({ query: 'test' });
    expect(reply.code).toHaveBeenCalledWith(200);
  });

  it('syncs knowledge item and retries upload', async () => {
    const syncUseCase = { execute: vi.fn().mockResolvedValue({ id: 'k1' }) };
    const retryUseCase = { execute: vi.fn().mockResolvedValue({ id: 'k1' }) };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      syncUseCase as any,
      retryUseCase as any,
      { isEnabled: vi.fn() } as any,
    );
    const replySync = makeReply();
    const replyRetry = makeReply();

    await controller.sync(
      { params: { id: 'k1' }, body: { uploadDocId: 'doc-1' } } as any,
      replySync as any,
    );
    await controller.retry({ params: { id: 'k1' } } as any, replyRetry as any);

    expect(syncUseCase.execute).toHaveBeenCalledWith({ knowledgeId: 'k1', uploadDocId: 'doc-1' });
    expect(replySync.code).toHaveBeenCalledWith(200);
    expect(replyRetry.code).toHaveBeenCalledWith(200);
  });

  it('uses body file fallback when request.file throws', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockResolvedValue('doc-1') };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      file: vi.fn().mockRejectedValue(new Error('no file')),
      body: { file: { filename: 'doc.txt', toBuffer: vi.fn().mockResolvedValue(Buffer.from('x')) } },
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('uses body files fallback when request.file missing', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockResolvedValue('doc-1') };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      body: { files: [{ filename: 'doc.txt', toBuffer: vi.fn().mockResolvedValue(Buffer.from('x')) }] },
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('uses iterator fallback for upload file', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockResolvedValue('doc-1') };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      files: async function* () {
        yield { filename: 'doc.txt', toBuffer: async () => Buffer.from('x') };
      },
      body: {},
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(201);
  });

  it('defaults filename when body file missing name', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockResolvedValue('doc-1') };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      body: { file: { toBuffer: vi.fn().mockResolvedValue(Buffer.from('x')) } },
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(uploadDocumentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'upload', fileName: 'upload' }),
    );
  });

  it('defaults filename when body files missing name', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockResolvedValue('doc-1') };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      body: { files: [{ toBuffer: vi.fn().mockResolvedValue(Buffer.from('x')) }] },
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(uploadDocumentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'upload', fileName: 'upload' }),
    );
  });

  it('defaults filename when iterator part missing name', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockResolvedValue('doc-1') };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      files: async function* () {
        yield { toBuffer: async () => Buffer.from('x') };
      },
      body: {},
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(uploadDocumentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'upload', fileName: 'upload' }),
    );
  });

  it('handles TaxKB upload error without existing doc', async () => {
    const uploadDocumentUseCase = { execute: vi.fn().mockRejectedValue(new TaxKBError('bad', 500, { detail: {} })) };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      uploadDocumentUseCase as any,
      {} as any,
      {} as any,
      { isEnabled: vi.fn().mockReturnValue(true) } as any,
    );
    const reply = makeReply();
    const request = {
      file: vi.fn().mockResolvedValue({ filename: 'doc.txt', toBuffer: vi.fn().mockResolvedValue(Buffer.from('x')) }),
      body: {},
      log: { error: vi.fn() },
    };

    await controller.upload(request as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  it('returns error when progress fetch fails', async () => {
    const adapter = {
      isEnabled: vi.fn().mockReturnValue(true),
      getProcessingProgress: vi.fn().mockRejectedValue(new Error('boom')),
    };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      adapter as any,
    );
    const reply = makeReply();

    await controller.getProgress({ params: { id: 'doc-1' } } as any, reply as any);

    expect(reply.code).toHaveBeenCalledWith(500);
  });

  it('handles sync and retry errors', async () => {
    const syncUseCase = { execute: vi.fn().mockRejectedValue(new Error('invalid payload')) };
    const retryUseCase = { execute: vi.fn().mockRejectedValue(new Error('required field')) };
    const controller = new KnowledgeController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      syncUseCase as any,
      retryUseCase as any,
      { isEnabled: vi.fn() } as any,
    );
    const replySync = makeReply();
    const replyRetry = makeReply();

    await controller.sync({ params: { id: 'k1' }, body: {} } as any, replySync as any);
    await controller.retry({ params: { id: 'k1' } } as any, replyRetry as any);

    expect(replySync.code).toHaveBeenCalledWith(400);
    expect(replyRetry.code).toHaveBeenCalledWith(400);
  });
});
