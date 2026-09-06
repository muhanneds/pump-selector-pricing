// Motor price list -- extracted from Desktop/prices.xlsx "Prices" sheet (MSM/MSM-F rows).
// Model codes are used verbatim as typed/selected by the user; no HP is parsed from the
// code (the numeric suffix is not a direct HP value for 6in+ sizes).
const MOTOR_DATA = {
  "MSM 4/0.5 1P": {
    "price": 325,
    "size": "4\"",
    "len": 345
  },
  "MSM 4/0.75 1P": {
    "price": 335,
    "size": "4\"",
    "len": 375
  },
  "MSM 4/1 1P": {
    "price": 365,
    "size": "4\"",
    "len": 395
  },
  "MSM 4/1.5 1P": {
    "price": 410,
    "size": "4\"",
    "len": 440
  },
  "MSM 4/2 1P": {
    "price": 420,
    "size": "4\"",
    "len": 485
  },
  "MSM 4/3 1P": {
    "price": 545,
    "size": "4\"",
    "len": 505
  },
  "MSM 4/4 1P": {
    "price": 845,
    "size": "4\"",
    "len": 525
  },
  "MSM 4/1 3P": {
    "price": 335,
    "size": "4\"",
    "len": 375
  },
  "MSM 4/1.5 3P": {
    "price": 380,
    "size": "4\"",
    "len": 395
  },
  "MSM 4/2 3P": {
    "price": 425,
    "size": "4\"",
    "len": 440
  },
  "MSM 4/3 3P": {
    "price": 470,
    "size": "4\"",
    "len": 485
  },
  "MSM 4/4 3P": {
    "price": 645,
    "size": "4\"",
    "len": 558
  },
  "MSM 4/5.5 3P": {
    "price": 755,
    "size": "4\"",
    "len": 628
  },
  "MSM 4/7.5 3P": {
    "price": 1025,
    "size": "4\"",
    "len": 698
  },
  "MSM 4/10 3P": {
    "price": 1175,
    "size": "4\"",
    "len": 778
  },
  "MSM-F 4/0.75 1P": {
    "price": 270,
    "size": "4\"",
    "len": 376
  },
  "MSM-F 4/1 1P": {
    "price": 300,
    "size": "4\"",
    "len": 396
  },
  "MSM-F 4/1.5 1P": {
    "price": 325,
    "size": "4\"",
    "len": 451
  },
  "MSM-F 4/2 1P": {
    "price": 360,
    "size": "4\"",
    "len": 506
  },
  "MSM-F 4/3 1P": {
    "price": 460,
    "size": "4\"",
    "len": 622
  },
  "MSM-F 4/1 3P": {
    "price": 300,
    "size": "4\"",
    "len": 431
  },
  "MSM-F 4/1.5 3P": {
    "price": 335,
    "size": "4\"",
    "len": 466
  },
  "MSM-F 4/2 3P": {
    "price": 360,
    "size": "4\"",
    "len": 506
  },
  "MSM-F 4/3 3P": {
    "price": 445,
    "size": "4\"",
    "len": 561
  },
  "MSM-F 4/4 3P": {
    "price": 625,
    "size": "4\"",
    "len": 646
  },
  "MSM-F 4/5.5 3P": {
    "price": 740,
    "size": "4\"",
    "len": 712
  },
  "MSM-F 4/7.5 3P": {
    "price": 1000,
    "size": "4\"",
    "len": 817
  },
  "MSM-F 4/10 3P": {
    "price": 1175,
    "size": "4\"",
    "len": 927
  },
  "MSM 4/1 230V/3P": {
    "price": 370,
    "size": "4\"",
    "len": 375
  },
  "MSM 4/1.5 230V/3P": {
    "price": 465,
    "size": "4\"",
    "len": 395
  },
  "MSM 4/2 230V/3P": {
    "price": 470,
    "size": "4\"",
    "len": 440
  },
  "MSM 4/3 230V/3P": {
    "price": 530,
    "size": "4\"",
    "len": 485
  },
  "MSM 4/4 230V/3P": {
    "price": 715,
    "size": "4\"",
    "len": 558
  },
  "MSM 4/5.5 230V/3P": {
    "price": 845,
    "size": "4\"",
    "len": 628
  },
  "MSM 4/7.5 230V/3P": {
    "price": 1105,
    "size": "4\"",
    "len": 698
  },
  "MSM 5/5.5": {
    "price": 1420,
    "size": "5\"",
    "len": 636
  },
  "MSM 5/7.5": {
    "price": 1425,
    "size": "5\"",
    "len": 636
  },
  "MSM 5/10": {
    "price": 1465,
    "size": "5\"",
    "len": 681
  },
  "MSM 5/12.5": {
    "price": 1540,
    "size": "5\"",
    "len": 731
  },
  "MSM 5/15": {
    "price": 1640,
    "size": "5\"",
    "len": 776
  },
  "MSM 5/17.5": {
    "price": 1715,
    "size": "5\"",
    "len": 826
  },
  "MSM 5/20": {
    "price": 1825,
    "size": "5\"",
    "len": 876
  },
  "MSM 5/25": {
    "price": 1880,
    "size": "5\"",
    "len": 876
  },
  "MSM 5/30": {
    "price": 1925,
    "size": "5\"",
    "len": 876
  },
  "MSM 6/5.5": {
    "price": 1045,
    "size": "6\"",
    "len": 722
  },
  "MSM 6/7.5": {
    "price": 1080,
    "size": "6\"",
    "len": 751
  },
  "MSM 6/10": {
    "price": 1155,
    "size": "6\"",
    "len": 831
  },
  "MSM 6/12.5": {
    "price": 1345,
    "size": "6\"",
    "len": 873
  },
  "MSM 6/15": {
    "price": 1375,
    "size": "6\"",
    "len": 924
  },
  "MSM 6/17.5": {
    "price": 1540,
    "size": "6\"",
    "len": 984
  },
  "MSM 6/20": {
    "price": 1620,
    "size": "6\"",
    "len": 1046
  },
  "MSM 6/25": {
    "price": 1805,
    "size": "6\"",
    "len": 1079
  },
  "MSM 6/30": {
    "price": 1945,
    "size": "6\"",
    "len": 1179
  },
  "MSM 6/35": {
    "price": 2365,
    "size": "6\"",
    "len": 1290
  },
  "MSM 6/40": {
    "price": 2510,
    "size": "6\"",
    "len": 1320
  },
  "MSM 6/50": {
    "price": 2730,
    "size": "6\"",
    "len": 1420
  },
  "MSM 6/60": {
    "price": 3335,
    "size": "6\"",
    "len": 1480
  },
  "MSM 7/30": {
    "price": 2225,
    "size": "7\"",
    "len": 963
  },
  "MSM 7/35": {
    "price": 2410,
    "size": "7\"",
    "len": 1013
  },
  "MSM 7/40": {
    "price": 2465,
    "size": "7\"",
    "len": 1053
  },
  "MSM 7/50": {
    "price": 2770,
    "size": "7\"",
    "len": 1133
  },
  "MSM 7/60": {
    "price": 3025,
    "size": "7\"",
    "len": 1212
  },
  "MSM 7/70": {
    "price": 3270,
    "size": "7\"",
    "len": 1291
  },
  "MSM 7/75": {
    "price": 3270,
    "size": "7\"",
    "len": 1291
  },
  "MSM 7/80": {
    "price": 3850,
    "size": "7\"",
    "len": 1306
  },
  "MSM 7/90": {
    "price": 4435,
    "size": "7\"",
    "len": 1396
  },
  "MSM 7/100": {
    "price": 4865,
    "size": "7\"",
    "len": 1489
  },
  "MSM 8/40": {
    "price": 2810,
    "size": "8\"",
    "len": 1158
  },
  "MSM 8/50": {
    "price": 2905,
    "size": "8\"",
    "len": 1258
  },
  "MSM 8/60": {
    "price": 3190,
    "size": "8\"",
    "len": 1303
  },
  "MSM 8/70": {
    "price": 3555,
    "size": "8\"",
    "len": 1388
  },
  "MSM 8/75": {
    "price": 3555,
    "size": "8\"",
    "len": 1388
  },
  "MSM 8/80": {
    "price": 3885,
    "size": "8\"",
    "len": 1443
  },
  "MSM 8/90": {
    "price": 4125,
    "size": "8\"",
    "len": 1468
  },
  "MSM 8/100": {
    "price": 4190,
    "size": "8\"",
    "len": 1493
  },
  "MSM 8/110": {
    "price": 4565,
    "size": "8\"",
    "len": 1573
  },
  "MSM 8/125": {
    "price": 4800,
    "size": "8\"",
    "len": 1638
  },
  "MSM 8/150": {
    "price": 5665,
    "size": "8\"",
    "len": 1692
  },
  "MSM 10/110": {
    "price": 5775,
    "size": "10\"",
    "len": 1472
  },
  "MSM 10/125": {
    "price": 5920,
    "size": "10\"",
    "len": 1532
  },
  "MSM 10/150": {
    "price": 6530,
    "size": "10\"",
    "len": 1612
  },
  "MSM 10/175": {
    "price": 7030,
    "size": "10\"",
    "len": 1712
  },
  "MSM 10/200": {
    "price": 8130,
    "size": "10\"",
    "len": 1842
  },
  "MSM 10/225": {
    "price": 9550,
    "size": "10\"",
    "len": 1922
  },
  "MSM 10/250": {
    "price": 11110,
    "size": "10\"",
    "len": 1922
  },
  "MSM 10/300": {
    "price": 13550,
    "size": "10\"",
    "len": 2040
  },
  "MSM 10/340": {
    "price": 16000,
    "size": "10\"",
    "len": 2120
  }
};
