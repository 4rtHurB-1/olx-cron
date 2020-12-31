const CRON_SCHEDULES = process.env.CRON_SCHEDULES
    ? process.env.CRON_SCHEDULES.split(';')
    : [];

export default {
    prod: {
        db: {
            url: process.env.DB_URL || 'mongodb+srv://full-cron-user:hCXmJVqjyqtuOYRk@phone-cluster.0zlrx.mongodb.net/olx?retryWrites=true&w=majority'
        },

        logs: {
            db: {
                url: 'mongodb+srv://full-cron-user:hCXmJVqjyqtuOYRk@phone-numbers.wurpz.mongodb.net/olx?retryWrites=true&w=majority',
                collection: 'logs'
            },
            tel: {
                token: '1403411176:AAH_eZ_E9DRmsjitnqEVa9haRVv_dWph67Y',
                chat_id: '385748679'
            }
        },

        // can be db stored
        category_urls: [
            'https://www.olx.ua/uk/zhivotnye/khmelnitskiy/',
            'https://www.olx.ua/uk/hobbi-otdyh-i-sport/khmelnitskiy/'
        ],

        // can be db stored
        check_number_save: {
            key: 'Західний',
            ver: 'v1',
        },

        // can be db stored
        list_adverts_save: {
            ver: 'v1'
        },

        // can be db stored
        stat: {
            hours_formula: `=IF(MOD(HOUR(B:row);'📈 Стат.'!$A$7) = 0; '📈 Стат.'!$A$7*FLOOR(HOUR(B:row)/'📈 Стат.'!$A$7) & ":00 - " & '📈 Стат.'!$A$7*FLOOR(HOUR(B:row)/'📈 Стат.'!$A$7+1); '📈 Стат.'!$A$7*FLOOR(HOUR(B:row)/'📈 Стат.'!$A$7) & ":00 - " & '📈 Стат.'!$A$7*FLOOR(HOUR(B:row)/'📈 Стат.'!$A$7+1)) & ":00"`,
            period: '1 hour',
        },

        // can be db stored
        crawler_api: {
            hosts: process.env.CRAWLER_API_HOST
                ? process.env.CRAWLER_API_HOST.split(';')
                : ['http://46.63.123.61:3031'],
            run_url: 'download',
            collection_name: 'adverts'
        },

        // can be db stored
        cron_schedules: {
            update_stats: CRON_SCHEDULES[0] || '*/15 * * * *',
            run_crawler: CRON_SCHEDULES[1] || '15,25,50 * * * *',
            phone_checks: CRON_SCHEDULES[2] || '2,32 0-7 * * *',
            assign_adverts: CRON_SCHEDULES[3] || '10,40 * * * *',
            /*update_stats: CRON_SCHEDULES[0] || '*!/15 * * * *',
            run_crawler: CRON_SCHEDULES[1] || '*!/10 * * * *',
            phone_checks: CRON_SCHEDULES[2] || '15,35,55 * * * *',
            assign_adverts: CRON_SCHEDULES[3] || '5,25,40 * * * *',*/
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

        sheets: {
            phone_check: {
                id: '1wlNiEXsWgkbsbqNVChs7arH_QFM4Qiaymx1j7B6c3Hc',
                worksheets: {
                    main: {
                        id: 0,
                        range: 'A1:A21000'
                    },
                    new: {
                        id: 1523355869,
                        range: 'E3:E1000'
                    }
                },
                format_range: 'A:C'
            },
            phone_list: {
                id: '1dT70wa_35lm8hfBAkMLb_I1HWJ5cJVDfkMvI-0ZzSZY',
                worksheets: {
                    stat: {
                        id: 1643776889,
                        range: 'A1:J174'
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
    },

    test: {
        db: {
            url: 'mongodb+srv://full-cron-user:hCXmJVqjyqtuOYRk@phone-numbers.wurpz.mongodb.net/olx?retryWrites=true&w=majority',
        },

        logs: {
            db: {
                url: 'mongodb+srv://full-cron-user:hCXmJVqjyqtuOYRk@phone-numbers.wurpz.mongodb.net/olx?retryWrites=true&w=majority',
                collection: 'logs'
            },
            tel: {
                token: '1403411176:AAH_eZ_E9DRmsjitnqEVa9haRVv_dWph67Y',
                chat_id: '385748679'
            }
        },

        // can be db stored
        category_urls: [
            'https://www.olx.ua/uk/zhivotnye/khmelnitskiy/',
            'https://www.olx.ua/uk/hobbi-otdyh-i-sport/khmelnitskiy/'
        ],

        // can be db stored
        check_number_save: {
            key: 'Західний ТЕСТ',
            ver: 'v1',
        },

        // can be db stored
        list_adverts_save: {
            ver: 'v1'
        },

        // can be db stored
        stat: {
            hours_formula: `=IF(MOD(HOUR(B:row);'📈 Стат.'!$A$7) = 0; '📈 Стат.'!$A$7*FLOOR(HOUR(B:row)/'📈 Стат.'!$A$7) & ":00 - " & '📈 Стат.'!$A$7*FLOOR(HOUR(B:row)/'📈 Стат.'!$A$7+1); '📈 Стат.'!$A$7*FLOOR(HOUR(B:row)/'📈 Стат.'!$A$7) & ":00 - " & '📈 Стат.'!$A$7*FLOOR(HOUR(B:row)/'📈 Стат.'!$A$7+1)) & ":00"`,
            period: '1 hour',
        },

        // can be db stored
        crawler_api: {
            hosts: process.env.CRAWLER_API_HOST
                ? process.env.CRAWLER_API_HOST.split(';')
                : ['http://46.63.123.61:3031'],
            run_url: 'download',
            collection_name: 'adverts'
        },

        // can be db stored
        cron_schedules: {
            update_stats: CRON_SCHEDULES[0] || '*/15 * * * *',
            run_crawler: CRON_SCHEDULES[1] || '*/10 * * * *',
            phone_checks: CRON_SCHEDULES[2] || '15,35,55 * * * *',
            assign_adverts: CRON_SCHEDULES[3] || '5,25,40 * * * *',
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

        sheets: {
            // new
            phone_check: {
                id: '1Pet6pU24iB5CCCpH6LYWJFiYhPGcNxBAB4HxU6WO3Ww',
                worksheets: {
                    main: {
                        id: 0,
                        range: 'A1:A21000'
                    },
                    new: {
                        id: 1523355869,
                        range: 'E3:E1000'
                    }
                },
                format_range: 'A:C'
            },
           /* phone_check: {
                id: '1sRoWLcIr7Y85-3o0MZXWbmKbptF97texFyK1QyZNzqQ',
                worksheets: {
                    main: {
                        id: 1214041824,
                        range: 'A1:A21000'
                    }
                }
            },*/
            phone_list: {
                id: '1sRoWLcIr7Y85-3o0MZXWbmKbptF97texFyK1QyZNzqQ',
                worksheets: {
                    stat: {
                        id: 1643776889,
                        range: 'A1:J174'
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
    },
}