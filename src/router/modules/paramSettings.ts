const Layout = () => import("@/layout/index.vue");

export default {
  path: "/paramSettings",
  name: "ParamSettingsLayout",
  component: Layout,
  redirect: "/paramSettings/dict",
  meta: {
    // icon: "setting",
    title: "船舶设置",
    rank: 20
  },
  children: [
    {
      path: "/paramSettings/systemState",
      name: "ParamSystemState",
      component: () => import("@/views/paramSettings/systemState/index.vue"),
      meta: {
        title: "系统状态"
        // icon: "monitor"
      }
    },
    {
      path: "/paramSettings/alarmConfig",
      name: "ParamAlarmConfig",
      component: () => import("@/views/paramSettings/alarmConfig/index.vue"),
      meta: {
        title: "报警配置"
        // icon: "setting"
      }
    },
    {
      path: "/paramSettings/alarmRecord",
      name: "ParamAlarmRecord",
      component: () => import("@/views/paramSettings/alarmRecord/index.vue"),
      meta: {
        title: "报警记录",
        icon: "document"
      }
    },
    {
      path: "/paramSettings/dict",
      name: "ParamDict",
      component: () => import("@/views/paramSettings/dict/index.vue"),
      meta: {
        title: "数据字典",
        icon: "list"
      }
    },
    {
      path: "/paramSettings/elefence",
      name: "ParamElefence",
      component: () => import("@/views/paramSettings/elefence/index.vue"),
      meta: {
        title: "电子围栏",
        icon: "location"
      }
    },
    {
      path: "/paramSettings/alaramType",
      name: "ParamAlaramType",
      component: () => import("@/views/paramSettings/alaramType/index.vue"),
      meta: {
        title: "报警类型",
        icon: "bell"
      }
    },
    {
      path: "/paramSettings/shipShoreComm",
      name: "ParamShipShoreComm",
      component: () => import("@/views/paramSettings/shipShoreComm/index.vue"),
      meta: {
        title: "船岸通信",
        icon: "promotion"
      }
    },
    {
      path: "/paramSettings/device/camera",
      name: "ParamDeviceCamera",
      component: () => import("@/views/paramSettings/device/camera/index.vue"),
      meta: {
        title: "摄像机",
        icon: "video-camera"
      }
    }
  ]
} as RouteConfigsTable;
