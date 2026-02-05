export class IReviewRepository {
  async findById(_id) {
    throw new Error('[IReviewRepository] findById() must be implemented');
  }

  async list(_filters = {}) {
    throw new Error('[IReviewRepository] list() must be implemented');
  }

  async create(_payload) {
    throw new Error('[IReviewRepository] create() must be implemented');
  }

  async complete(_id, _payload) {
    throw new Error('[IReviewRepository] complete() must be implemented');
  }
}
