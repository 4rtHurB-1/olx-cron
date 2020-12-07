const CRON_SCHEDULES = process.env.CRON_SCHEDULES
    ? process.env.CRON_SCHEDULES.split(';')
    : [];

export default {
  db: {
    url: process.env.DB_URL || 'mongodb+srv://full-cron-user:hCXmJVqjyqtuOYRk@phone-cluster.0zlrx.mongodb.net/olx?retryWrites=true&w=majority'
  },

  logs_db: {
    url: 'mongodb+srv://full-cron-user:hCXmJVqjyqtuOYRk@phone-numbers.wurpz.mongodb.net/olx?retryWrites=true&w=majority',
    collection: 'logs'
  },

  category_url: 'https://www.olx.ua/uk/zhivotnye/selskohozyaystvennye-zhivotnye/khmelnitskiy/',
  max_adv_per_groups: 50,
  group: 9,
  group_demands: {
      group1: 10,
      group2: 10,
      group3: 10,
      group4: 10,
      group5: 10,
      group6: 10,
      group7: 10,
      group8: 10,
      group9: 10,
  },
  check_numbers_save_key: 'Західний',

  stat_hours_formula: `=IF(MOD(HOUR(B:row);'Статистика'!$B$6) = 0; 'Статистика'!$B$6*FLOOR(HOUR(B:row)/'Статистика'!$B$6) & ":00 - " & 'Статистика'!$B$6*FLOOR(HOUR(B:row)/'Статистика'!$B$6+1); 'Статистика'!$B$6*FLOOR(HOUR(B:row)/'Статистика'!$B$6) & ":00 - " & 'Статистика'!$B$6*FLOOR(HOUR(B:row)/'Статистика'!$B$6+1)) & ":00"`,

  crawler_api: {
    hosts: process.env.CRAWLER_API_HOST
        ? process.env.CRAWLER_API_HOST.split(';')
        : ['http://46.63.123.61:3031'],
    run_url: 'download',
    collection_name: 'adverts'
  },

    cron_schedules: {
        update_stats: CRON_SCHEDULES[0] || '*/15 * * * *',
        run_crawler: CRON_SCHEDULES[1] || '*/5 * * * *',
        phone_checks: CRON_SCHEDULES[2] || '5,15,25,35,45,55 * * * *',
        assign_adverts: CRON_SCHEDULES[3] || '*/10 * * * *',
    },

  gapi: {
    "client_id":"830124884111-u6bnodoiqql6756o5gc6kjloio8d1v1g.apps.googleusercontent.com",
    "project_id":"olx-cron-1605099552389",
    "auth_uri":"https://accounts.google.com/o/oauth2/auth",
    "token_uri":"https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
    "client_secret":"jtC7Op7ilvPQTLGO8ZLPyOeT",
    "redirect_uris":["urn:ietf:wg:oauth:2.0:oob","http://localhost"],

    token_file_name: 'gapi-token.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  },

  test_sheets: {
      phone_check: {
          id: '1dT70wa_35lm8hfBAkMLb_I1HWJ5cJVDfkMvI-0ZzSZY',
          worksheets: {
              main: 1085949262
          },
          range: 'A1:C20000',
          phone_range: 'A1:A20000'
      },
      phone_list: {
          id: '1dT70wa_35lm8hfBAkMLb_I1HWJ5cJVDfkMvI-0ZzSZY',
          worksheets: {
              stat: {
                  id: 1643776889,
                  range: 'A1:I174'
              },
              group1: 660317970,
              group2: 640437545,
              group3: 584399345,
              group4: 1140797687,
              group5: 1540824733,
              group6: 901242702,
              group7: 1540135171,
              group8: 2028199913,
              group9: 1845561552,
          },
          range: 'A2:D100'
      }
  },

  sheets: {
    phone_check: {
      id: '1wlNiEXsWgkbsbqNVChs7arH_QFM4Qiaymx1j7B6c3Hc',
      test_id: '1JwuoRmHlo81hcAltcpOgwZB1npUc5an7q0E3gs7g41g',
      worksheets: {
        main: 'Аркуш1',
        test: 1085949262
      },
      range: 'A2:C20000',
      phone_range: 'A1:A20000'
    },
    phone_list: {
      id: '1JwuoRmHlo81hcAltcpOgwZB1npUc5an7q0E3gs7g41g',
      worksheets: {
          stat: {
              id: 0,
              range: 'A1:I174'
          },
          group1: 660317970,
          group2: 640437545,
          group3: 584399345,
          group4: 1140797687,
          group5: 1540824733,
          group6: 901242702,
          group7: 1540135171,
          group8: 2028199913,
          group9: 1845561552,
      },
      range: 'A2:D100'
    }
  }
}