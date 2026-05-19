const Layout = () => import("@/layout/index.vue");

export default {
  path: "/boatDevice",
  name: "BoatDeviceLayout",
  component: Layout,
  redirect: "/boatDevice/index",
  meta: {
    icon: "ship",
    title: "船舶设备",
    rank: 10
  },
  children: [
    {
      path: "/boatDevice/index",
      name: "BoatDevice",
      component: () => import("@/views/boatDevice/shipForm/index.vue"),
      meta: {
        title: "设备列表",
        icon: "list"
      }
    },
    {
      path: "/boatDevice/software",
      name: "BoatSoftware",
      component: () => import("@/views/boatDevice/software/index.vue"),
      meta: {
        title: "软件更新",
        icon: "upload"
      }
    },
    {
      path: "/boatDevice/version",
      name: "BoatVersion",
      component: () => import("@/views/boatDevice/version/index.vue"),
      meta: {
        title: "版本发布",
        icon: "rocket"
      }
    },
    {
      path: "/boatDevice/dataManage",
      name: "BoatDataManage",
      component: () => import("@/views/boatDevice/dataManage/index.vue"),
      meta: {
        title: "数据管理",
        icon: "dataAnalysis"
      }
    }
  ]
} as RouteConfigsTable;
