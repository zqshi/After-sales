/**
 * TaskService - 任务服务
 *
 * 负责与后端Task API交互
 */

export class TaskService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * 创建任务
   * @param {Object} taskData - 任务数据
   * @param {string} taskData.title - 任务标题
   * @param {string} taskData.type - 任务类型（quality-check, feature-request, bug-fix等）
   * @param {string} taskData.priority - 优先级（urgent, high, normal, low）
   * @param {string} [taskData.conversationId] - 关联的对话ID
   * @param {string} [taskData.requirementId] - 关联的需求ID
   * @param {string} [taskData.description] - 任务描述
   * @returns {Promise<Object>} 创建的任务
   */
  async createTask(taskData) {
    try {
      const response = await this.apiClient.post('/api/tasks', taskData);
      return response.data;
    } catch (error) {
      console.error('[TaskService] 创建任务失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务详情
   * @param {string} taskId - 任务ID
   * @returns {Promise<Object>} 任务详情
   */
  async getTask(taskId) {
    try {
      const response = await this.apiClient.get(`/api/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      console.error('[TaskService] 获取任务失败:', error);
      throw error;
    }
  }

  /**
   * 列出任务
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 任务列表
   */
  async listTasks(filters = {}) {
    try {
      const response = await this.apiClient.get('/api/tasks', { params: filters });
      return response.data;
    } catch (error) {
      console.error('[TaskService] 列出任务失败:', error);
      throw error;
    }
  }

  /**
   * 分配任务
   * @param {string} taskId - 任务ID
   * @param {string} assigneeId - 受让人ID
   * @returns {Promise<Object>} 更新后的任务
   */
  async assignTask(taskId, assigneeId) {
    try {
      const response = await this.apiClient.post(`/api/tasks/${taskId}/assign`, { assigneeId });
      return response.data;
    } catch (error) {
      console.error('[TaskService] 分配任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务状态
   * @param {string} taskId - 任务ID
   * @param {string} status - 新状态（pending, in_progress, completed, cancelled）
   * @returns {Promise<Object>} 更新后的任务
   */
  async updateTaskStatus(taskId, status) {
    try {
      const response = await this.apiClient.patch(`/api/tasks/${taskId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('[TaskService] 更新任务状态失败:', error);
      throw error;
    }
  }

  /**
   * 完成任务
   * @param {string} taskId - 任务ID
   * @param {Object} [qualityScore] - 质量评分
   * @returns {Promise<Object>} 完成后的任务
   */
  async completeTask(taskId, qualityScore = null) {
    try {
      const response = await this.apiClient.post(`/api/tasks/${taskId}/complete`, { qualityScore });
      return response.data;
    } catch (error) {
      console.error('[TaskService] 完成任务失败:', error);
      throw error;
    }
  }
}
