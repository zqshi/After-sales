# Mock Data Paths

This document lists mock data files used for demo flows and tests.

## WeCom (Enterprise WeChat) group chat mock data

These files are used by the demo sync endpoint `POST /im/wecom/mock/sync` to seed conversations and messages.

- Group list: `tests/wecom/groupchat_list.json`
- Group details: `tests/wecom/groupchat_details.json`
- Group messages: `tests/wecom/groupchat_messages.json`
- Message audit event sample: `tests/wecom/msgaudit_notify.xml`
- App chat send payload samples: `tests/wecom/appchat_send_requests.json`

## Notes

- Do not edit mock data in-place for production use.
- If you add new mock sources, update this document with the file paths and purpose.
