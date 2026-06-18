import { http } from "@/utils/http";

export interface JobQuery extends BasePageQuery {
  jobName?: string;
  jobGroup?: string;
  status?: number;
}

export interface JobDTO {
  jobId?: number;
  jobName?: string;
  jobGroup?: string;
  invokeTarget?: string;
  cronExpression?: string;
  concurrent?: number;
  concurrentStr?: string;
  status?: number;
  statusStr?: string;
  remark?: string;
  createTime?: Date;
}

export interface JobInvokeTargetDTO {
  invokeTarget: string;
  beanName: string;
  methodName: string;
  name: string;
  group: string;
  description?: string;
}

export interface JobRequest {
  jobId?: number;
  jobName: string;
  jobGroup: string;
  invokeTarget: string;
  cronExpression: string;
  concurrent: number;
  status: number;
  remark?: string;
}

export interface UpdateJobStatusRequest {
  status: number;
}

export const getJobListApi = (params?: JobQuery) => {
  return http.request<ResponseData<PageDTO<JobDTO>>>("get", "/system/jobs", {
    params
  });
};

export const getJobInfoApi = (jobId: number) => {
  return http.request<ResponseData<JobDTO>>("get", `/system/jobs/${jobId}`);
};

export const getJobInvokeTargetsApi = () => {
  return http.request<ResponseData<JobInvokeTargetDTO[]>>(
    "get",
    "/system/jobs/invoke-targets"
  );
};

export const addJobApi = (data: JobRequest) => {
  return http.request<ResponseData<void>>("post", "/system/jobs", { data });
};

export const updateJobApi = (jobId: number, data: JobRequest) => {
  return http.request<ResponseData<void>>("put", `/system/jobs/${jobId}`, {
    data
  });
};

export const updateJobStatusApi = (
  jobId: number,
  data: UpdateJobStatusRequest
) => {
  return http.request<ResponseData<void>>(
    "put",
    `/system/jobs/${jobId}/status`,
    { data }
  );
};

export const runJobApi = (jobId: number) => {
  return http.request<ResponseData<void>>("post", `/system/jobs/${jobId}/run`);
};

export const deleteJobApi = (jobIds: number[]) => {
  return http.request<ResponseData<void>>("delete", "/system/jobs", {
    params: {
      // 需要将数组转换为字符串，否则 Axios 会序列化成 jobIds[0]=1，后端 List<Long> 接收不到。
      jobIds: jobIds.toString()
    }
  });
};
