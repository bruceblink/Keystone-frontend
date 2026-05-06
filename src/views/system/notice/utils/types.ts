interface AddNoticeRequest {
  noticeId?: number;
  /** 公告标题 */
  noticeTitle: string;
  /** 公告类型 */
  noticeType?: number;
  /** 状态 */
  status?: number;
  /** 公告内容 */
  noticeContent: string;
}

interface FormProps {
  formInline: AddNoticeRequest;
}

export type { AddNoticeRequest, FormProps };
