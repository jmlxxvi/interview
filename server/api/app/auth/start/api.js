// import config from "../../../config.js";

const menuData = [
  {
    path: '/default',
    icon: 'dashboard.svg',
    title: 'Dashboard'
  },
  {
    path: '/masterdata',
    icon: 'shoppingmode.svg',
    title: 'Master Data Management',
    items: [
      {
        path: '/masterdata/vendor',
        title: 'Vendors'
      },
      {
        path: '/masterdata/product',
        title: 'Products'
      },
      {
        path: '/masterdata/unit_of_measure',
        title: 'Units of Measure'
      },
      {
        path: '/masterdata/work_center',
        title: 'Work Centers'
      },
      {
        path: '/masterdata/operation',
        title: 'Operations'
      },
      {
        path: '/masterdata/equipment',
        title: 'Equipment'
      }
    ]
  },
  {
    path: '/scheduling',
    icon: 'calendar-month.svg',
    title: 'Production Scheduling',
    items: [
      {
        path: '/scheduling/work_order',
        title: 'Work Orders'
      }
    ]
  },
  {
    path: '/execution',
    icon: 'manufacturing.svg',
    title: 'Execution',
    items: [
      {
        path: '/execution/work_order',
        title: 'Work Orders'
      }
    ]
  },
  {
    path: '/material_planning',
    icon: 'package2.svg',
    title: 'Material Planning',
    items: [
      {
        path: '/material_planning/planned_supply',
        title: 'Planned Supply'
      },
      {
        path: '/material_planning/projected_inventory',
        title: 'Projected Inventory'
      }
    ]
  },
  {
    path: '/quality',
    icon: 'editor-choice.svg',
    title: 'Quality Management',
    items: [
      {
        path: '/quality/inspection',
        title: 'Quality Inspection'
      }
    ]
  },
  {
    path: '/inventory',
    icon: 'inventory.svg',
    title: 'Inventory Management',
    items: [
      {
        path: '/inventory/location',
        title: 'Locations'
      },
      {
        path: '/inventory/browser',
        title: 'Inventory Browser'
      },
      // {
      //   path: '/inventory/movement',
      //   title: 'Inventory Movements'
      // },
      {
        path: '/inventory/warehouse_receiving', // Receipt, lot creation, vendor linking
        title: 'Warehouse Receiving'
      },
      {
        path: '/inventory/warehouse_transfer', // Movement between locations
        title: 'Warehouse Transfers'
      },
      {
        path: '/inventory/material_picking', // Reservation, lot selection (FEFO), transfers
        title: 'Material Picking'
      },
      {
        path: '/inventory/adjustment',
        title: 'Adjustments'
      } // Quality Inspection -> Lot hold/release (future extension) / Batch Execution -> Issue, consumption, return
    ]
  },
  {
    path: '/reporting',
    icon: 'bar-chart.svg',
    title: 'Reporting & Analytics',
    items: [
      {
        path: '/orders/pending',
        title: 'Pending Orders'
      },
      {
        path: '/orders/completed',
        title: 'Completed Orders'
      },
      {
        path: '/reporting/cubes',
        title: 'Cubes'
      }
    ]
  },
  {
    path: '/settings',
    icon: 'settings.svg',
    title: 'Settings'
  }
]

export const start = async (_args, context) => {
  const userData = context.session

  if (userData) {
    return {
      error: false,
      code: 1000,
      data: {
        // TODO this token is sent just to simplify the websockets connection after login, refactor later
        // we may want to avoid sending the token back in the response for security reasons
        // the app uses http only cookies to store the token, we may want to send a temporary or fungible token for websockets only
        token: context.token,
        ...userData,
        menu: menuData
      }
    }
  } else {
    return {
      error: true, code: 1002, data: null, message: 'User data not found'
    }
  }
}
