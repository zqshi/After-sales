MQ消息事件类型

工单mq消息事件类型，每个消息事件类型都可以根据mq的routing_key进行区分。订阅的时候可以配置不同的routing_key来订阅不同的消息事件

具体说明如下表

事件code

名称

routing_key

说明

create_ticket

创建工单

workorder.create_ticket

工单创建的时候触发，不管工单是否需要流转都会触发

update_ticket

更新工单

workorder.update_ticket

工单有修改操作的时候触发

close_ticket

关闭工单

workorder.close_ticket

工单被关闭的时候触发

forward_ticket

转派工单

workorder.forward_ticket

工单被转派给其他人处理的时候触发

cancel_ticket

取消工单

workorder.cancel_ticket

工单取消的时候触发。取消工单后对应的工单作废

start_handle

开始处理

workorder.start_handle

工单创建后，对应的处理人点击开始处理的时候触发

update_progress

更新进展

workorder.update_progress

工单开始处理后，后续处理人有更新进展的时候触发

finish_handle

处理完毕

workorder.finish_handle

工单开始处理后，处理人点击处理完成的时候触发

reject_handle

拒绝处理

workorder.reject_handle

处理人拒绝处理的时候触发。拒绝处理后发起人可以选择打回继续处理获取取消工单

return_handle

打回处理

workorder.return_handle

处理人将工单打回处理的时候触发。处理人处理完毕或拒绝处理后，发起人可以选择打回继续处理

review_fault

工单复核为故障

workorder.review_fault

工单复核为故障之后触发。同一个工单可能存在重新发起复核的情况，所以可能会多次触发


消息体格式

各个消息事件对应的消息体都是如下格式，可以根据工单类型和产品线过滤掉不想要的数据，然后根据工单ID调用获取工单信息的接口，参考工单相关接口

参数名称

参数说明

类型

备注

ticket_id

工单ID

int(64)



ticket_type

工单类型，参考：工单字典表

int(32)



product_group_id

产品线ID

int(64)



review_id

工单复核ID（工单复核独有）

int(32)



fault_uuid

故障uuid（工单复核独有）

string



action

对应上面的消息事件类型

string



示例

{
	"ticket_id": 1024,
	"ticket_type": 1,
	"product_group_id": 1,
	"review_id", 1, //工单复核独有
	"fault_uuid", "xxx", //工单复核独有
	"action": "create_ticket"
}