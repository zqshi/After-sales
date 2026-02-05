export class IProblemRepository {
  async findById(_id) {
    throw new Error('[IProblemRepository] findById() must be implemented');
  }

  async list(_filters = {}) {
    throw new Error('[IProblemRepository] list() must be implemented');
  }

  async create(_payload) {
    throw new Error('[IProblemRepository] create() must be implemented');
  }

  async updateStatus(_id, _status, _reason) {
    throw new Error('[IProblemRepository] updateStatus() must be implemented');
  }
}
