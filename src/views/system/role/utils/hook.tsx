import dayjs from "dayjs";
import { message } from "@/utils/message";
import {
  deleteRoleApi,
  getRoleListApi,
  RoleDTO,
  RoleQuery,
  updateRoleStatusApi
} from "@/api/system/role";
import { getMenuListApi, MenuDTO } from "@/api/system/menu";
import { ElMessage, ElMessageBox, type FormInstance } from "element-plus";
import { usePublicHooks } from "../../hooks";
import { type PaginationProps } from "@pureadmin/table";
import { onMounted, reactive, ref, toRaw } from "vue";
import { toTree } from "@/utils/tree";
import { CommonUtils } from "@/utils/common";

type SwitchState = {
  loading?: boolean;
};

type SwitchLoadMap = Record<number, SwitchState>;

export function useRole() {
  const form = reactive<RoleQuery>({
    roleKey: "",
    roleName: "",
    status: undefined
  });
  const dataList = ref<RoleDTO[]>([]);
  const loading = ref(true);
  const switchLoadMap = ref<SwitchLoadMap>({});
  const { switchStyle } = usePublicHooks();
  const pagination = reactive<PaginationProps>({
    total: 0,
    pageSize: 10,
    currentPage: 1,
    background: true
  });
  const columns: TableColumnList = [
    {
      label: "角色编号",
      prop: "roleId",
      minWidth: 100
    },
    {
      label: "角色名称",
      prop: "roleName",
      minWidth: 120
    },
    {
      label: "角色标识",
      prop: "roleKey",
      minWidth: 150
    },
    {
      label: "状态",
      minWidth: 130,
      cellRenderer: scope => (
        <el-switch
          size={scope.props.size === "small" ? "small" : "default"}
          loading={switchLoadMap.value[scope.index]?.loading}
          v-model={scope.row.status}
          active-value={1}
          inactive-value={0}
          active-text="已启用"
          inactive-text="已停用"
          inline-prompt
          style={switchStyle.value}
          onChange={() => onChange(scope.row as RoleDTO, scope.index)}
        />
      )
    },
    {
      label: "备注",
      prop: "remark",
      minWidth: 150
    },
    {
      label: "创建时间",
      minWidth: 180,
      prop: "createTime",
      formatter: ({ createTime }) =>
        dayjs(createTime).format("YYYY-MM-DD HH:mm:ss")
    },
    {
      label: "操作",
      fixed: "right",
      width: 240,
      slot: "operation"
    }
  ];

  async function onChange(row: RoleDTO, index: number) {
    const nextStatus = Number(row.status);
    const previousStatus = nextStatus === 0 ? 1 : 0;

    try {
      await ElMessageBox.confirm(
        `确认要<strong>${
          nextStatus === 0 ? "停用" : "启用"
        }</strong><strong style='color:var(--el-color-primary)'>${
          row.roleName
        }</strong>吗?`,
        "系统提示",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
          dangerouslyUseHTMLString: true,
          draggable: true
        }
      );

      switchLoading(index, true);
      await updateRoleStatusApi(row.roleId, nextStatus);
      message(`已${nextStatus === 0 ? "停用" : "启用"}${row.roleName}`, {
        type: "success"
      });
      await getList();
    } catch (e) {
      row.status = previousStatus;
      if (e === "cancel" || e === "close") {
        message("取消操作", {
          type: "info"
        });
      }
    } finally {
      switchLoading(index, false);
    }
  }

  function switchLoading(index: number, loading: boolean) {
    switchLoadMap.value[index] = Object.assign({}, switchLoadMap.value[index], {
      loading
    });
  }

  async function handleDelete(row: RoleDTO) {
    try {
      loading.value = true;
      await deleteRoleApi(row.roleId);
      message(`您删除了角色名称为${row.roleName}的这条数据`, {
        type: "success"
      });
      await getList();
    } catch (e) {
      console.error(e);
      message((e as Error)?.message || "删除失败", { type: "error" });
    } finally {
      loading.value = false;
    }
  }

  async function onSearch() {
    pagination.currentPage = 1;
    await getList();
  }

  async function getList() {
    try {
      CommonUtils.fillPaginationParams(form, pagination);
      loading.value = true;
      const { data } = await getRoleListApi(toRaw(form));
      dataList.value = data.rows;
      pagination.total = data.total;
    } catch (e) {
      console.error(e);
      ElMessage.error((e as Error)?.message || "加载失败");
    } finally {
      loading.value = false;
    }
  }

  const resetForm = (formEl?: FormInstance) => {
    if (!formEl) return;
    formEl.resetFields();
    onSearch();
  };

  const menuTree = ref<MenuDTO[]>([]);

  /** 菜单权限 */
  async function getMenuTree() {
    if (menuTree.value?.length) {
      return menuTree.value;
    }
    const { data } = await getMenuListApi({ isButton: false });
    menuTree.value = toTree(data, "id", "parentId");
    return menuTree.value;
  }

  /** 数据权限 可自行开发 */
  // function handleDatabase() {}

  onMounted(onSearch);

  return {
    form,
    loading,
    columns,
    dataList,
    pagination,
    onSearch,
    getList,
    resetForm,
    menuTree,
    getMenuTree,
    handleDelete
  };
}
