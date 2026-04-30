/*
SELECT GROUP_CONCAT(card SEPARATOR ',') FROM (SELECT CAST(SUBSTRING(card, 1, LOCATE(' ', card) - 1) AS UNSIGNED) AS card, AVG(pick) AS avg_pick FROM `draft_picks` WHERE game = 'restart' AND `set` = 7 AND dt >= '2024-09-01' GROUP BY card ORDER BY 2 DESC) t1;
*/

export const motd_order = {
  "10": [169,176,34,65,163,118,67,31,30,129,93,195,198,180,56,90,125,32,130,124,59,160,166,102,76,66,136,28,68,98,101,132,78,135,21,79,95,24,200,170,191,97,99,178,106,40,9,62,193,5,91,69,179,199,185,119,175,167,141,86,181,10,41,4,154,103,194,7,174,114,27,190,157,8,149,123,73,26,3,18,60,137,88,39,70,168,36,45,140,54,55,184,171,43,145,94,105,155,131,81,107,63,148,134,104,74,144,77,111,142,113,64,128,20,159,1,112,139,14,2,38,138,165,177,15,58,35,108,161,46,143,183,133,100,53,47,13,122,126,173,17,109,146,22,25,172,6,29,85,80,72,71,50,11,23,12,153,16,37,42,110,115,61,127,92,44,83,164,162,82,189,33,182,19,96,48,116,57,75,151,52,186,49,158,156,188,152,120,87,196,192,89,121,147,150,51,84,187,197,117],
  "20": [98,195,127,101,67,120,20,164,192,200,30,26,169,160,82,97,199,134,32,27,25,99,136,19,90,88,165,185,31,34,132,167,66,151,74,76,170,57,191,14,116,11,162,182,23,61,159,9,193,53,112,92,95,103,10,123,166,49,55,150,79,28,68,197,142,43,72,24,122,71,175,38,113,125,104,89,80,183,21,39,33,54,108,42,45,117,178,65,110,147,70,17,179,59,4,7,149,78,22,196,36,29,143,63,3,6,152,12,8,163,93,35,184,91,1,107,51,50,75,109,5,2,188,100,62,135,48,40,144,171,16,126,176,141,85,174,137,145,118,133,73,44,115,138,190,198,77,83,177,105,181,155,161,168,81,13,56,18,158,172,124,47,154,156,186,102,146,96,41,121,87,111,37,69,106,119,194,173,86,140,84,157,94,187,131,139,129,180,52,58,130,15,60,64,128,148,46,153,189,114],
  "30": [195,66,132,33,157,163,32,131,99,98,117,145,151,54,92,161,126,119,64,14,25,97,63,91,124,86,94,47,189,96,191,45,27,31,24,160,121,141,15,137,162,55,190,125,43,75,142,74,111,143,109,100,164,18,171,12,158,82,95,19,89,71,147,40,104,148,156,87,154,84,61,105,9,60,16,5,150,153,13,23,77,107,4,59,139,48,155,188,44,138,22,110,42,159,116,1,187,169,58,28,135,52,113,140,73,122,152,128,185,193,133,165,186,21,78,10,93,102,112,167,6,118,39,17,180,70,194,146,37,144,72,90,38,69,129,130,41,81,62,175,7,149,56,134,166,192,34,101,179,168,173,177,46,172,3,67,8,181,115,53,26,123,178,57,51,68,114,88,170,2,103,11,182,85,80,176,30,136,174,50,120,36,20,108,76,29,35,49,83,79,183,127,106,184,65],
  "40": [218,163,204,166,69,126,144,72,27,104,108,140,55,93,29,180,57,34,203,23,137,141,177,143,36,215,92,101,32,24,171,139,168,19,220,35,214,67,107,44,56,206,129,212,211,105,22,102,132,100,165,179,142,167,198,31,21,196,169,51,213,135,25,161,82,194,190,20,103,175,123,84,65,33,83,136,114,187,205,61,113,209,87,130,86,186,63,46,127,208,85,37,173,80,26,30,13,96,217,8,14,120,16,79,153,160,157,10,115,188,42,71,124,9,45,195,170,62,149,210,49,17,60,73,109,52,138,28,2,189,66,88,131,89,207,48,146,172,147,18,116,134,6,176,38,75,15,201,5,64,192,125,197,159,11,68,78,97,199,95,106,99,7,40,133,145,74,41,1,54,156,112,53,119,12,39,193,191,118,81,110,178,59,185,150,152,158,148,202,184,70,216,90,3,183,162,58,76,43,50,151,182,91,117,155,111,200,219,174,164,4,181,122,47,128,121,77,98,154,94],
  "50": [161,69,140,127,219,108,126,101,30,170,35,177,90,220,213,160,142,104,128,36,28,102,33,68,175,55,217,198,201,88,19,216,70,34,3,20,159,118,214,180,192,39,64,178,56,107,84,122,169,103,200,53,67,92,51,105,137,134,191,190,73,133,162,96,27,197,8,52,77,135,172,158,189,6,114,62,195,100,94,29,58,41,117,26,97,24,150,47,11,7,176,49,76,132,16,15,18,78,206,139,123,60,81,136,46,120,80,193,157,66,183,65,148,86,164,174,37,50,163,129,48,194,63,154,99,207,91,155,167,184,111,182,43,188,71,153,196,4,141,38,116,93,5,74,82,98,203,87,210,112,204,95,1,23,205,143,211,45,54,144,113,131,125,2,209,110,31,17,156,166,130,14,218,145,185,72,57,146,151,208,165,168,10,22,152,13,215,79,85,138,115,124,32,187,44,212,186,181,121,171,83,106,40,202,9,199,173,21,149,42,89,147,119,75,179,25,12,109,59,61],
  "60": [34,68,106,128,183,218,93,176,105,219,182,37,130,165,94,216,20,103,143,146,137,31,74,36,91,35,54,66,181,205,69,174,144,180,14,177,70,217,147,207,22,7,179,214,32,27,101,212,17,64,71,141,132,215,109,41,42,206,160,13,169,202,9,154,102,175,98,85,96,82,178,197,210,72,95,173,90,162,201,163,5,158,194,161,195,187,140,213,26,136,24,12,78,86,139,159,100,48,87,166,25,16,73,63,75,92,172,168,200,97,99,58,11,81,18,155,62,125,53,44,123,50,3,118,15,8,151,21,196,127,156,115,116,6,30,65,79,209,208,135,19,49,164,57,47,59,153,84,119,4,134,138,122,170,167,129,189,157,60,88,51,111,23,126,43,56,149,203,108,171,113,198,38,120,61,145,10,55,46,193,77,45,114,131,124,204,152,2,142,184,150,110,188,191,192,89,107,117,186,39,76,52,33,190,83,80,29,211,148,133,104,199,112,121,185,220,40,28,67,1],
  "70": [147,211,219,51,37,72,35,183,36,73,169,32,180,22,55,168,144,160,109,105,67,93,10,94,13,198,213,103,214,197,21,74,120,181,53,7,145,148,58,16,108,179,177,76,182,202,130,140,154,15,200,141,196,88,215,107,131,65,31,95,48,167,195,92,46,216,206,129,165,134,136,23,20,142,118,208,159,204,81,173,111,194,149,123,163,121,68,100,14,50,125,25,99,184,1,56,126,12,101,77,207,84,8,71,110,189,83,4,143,152,119,209,30,17,44,205,47,96,29,87,133,90,203,104,28,11,91,38,52,199,54,5,174,191,34,42,9,164,176,161,192,64,27,26,158,153,66,19,60,201,63,49,146,157,190,170,193,156,62,70,175,18,75,210,33,80,122,2,117,162,98,59,3,89,113,150,43,212,69,97,151,138,24,57,186,86,188,82,139,61,41,85,39,166,218,185,45,106,115,128,217,124,172,40,171,6,155,137,127,220,79,102,178,78,135,112,187,132,116,114]
}

export function get_motd_order(set, card){
  if(motd_order[set]) return motd_order[set].indexOf(card);
  return 1000;
}

export const karapet_score = {
  "10": [0,6.32,5.69,3.33,2.41,2.22,2.86,7.47,6.15,2.22,2.99,5.05,5.05,5.39,4.69,4.08,4.59,2.07,5.87,1.3,0,5.8,4.64,7.28,2.62,0,4.61,4.37,0,4.4,7.55,0,3.43,3.11,6.15,4.96,6.52,5.67,1.41,5.69,2.38,3.25,1.63,5.37,3.45,1.42,4.31,3.17,0,4.55,4.99,1.19,0,5,1.62,5.8,9.16,1.48,5.85,6.5,2.9,4.66,5.41,3.59,4.54,0,2.55,3.77,3.6,4,7.51,4.96,0,0,5.87,4.15,4.43,0,4.4,4.81,4.59,4.9,5.32,4.07,3.83,2.3,1.91,3.12,3.26,4.48,0,7.24,4.83,4.93,0,2.05,2.31,6.46,4.43,2.12,3.59,4.75,3.9,4.79,2.14,3.54,6.52,0,3.59,3.99,2.56,0,6.01,4.1,2.64,4.07,3.4,2.23,2.63,2.2,2.26,4.64,3.26,0,4.29,3.86,3.98,3.41,6.38,0,0,6.81,3.29,2,3.04,3.43,4.4,4.25,2.28,6.22,5.87,7.68,2.86,5.12,3.66,6.07,1.83,0,0,6.2,0,5.46,2.05,3.26,3.35,1.99,7.76,2.59,4.97,3.42,1.8,3.45,2.87,2.48,4.26,3.23,6.29,3.06,3.81,5.45,3.67,6.18,3.63,1.79,3.81,2.37,7.57,2.54,3.25,8.11,3.35,0,4.52,1.95,0,7.03,5.1,3.16,3.18,3.47,3.48,7.12,3.48,5.71,0.35,8.25,4.94,4.19,2.31,8.28,5.5],
  "20": [0,5.9,7.2,4.3,0.0,3.4,4.8,2.3,6.8,5.5,6.4,7.6,5.5,5.1,4.9,5.3,4.6,5.8,5.8,6.2,7.9,7.3,4.0,5.2,8.8,6.3,6.9,9.5,7.1,7.0,6.4,4.8,4.6,4.5,3.7,8.2,6.4,4.3,3.6,6.2,7.7,3.6,5.4,7.1,6.9,6.1,6.9,6.5,6.2,6.9,4.6,6.9,4.2,3.7,6.2,0.0,7.5,6.5,6.5,7.4,3.5,8.5,5.1,5.6,6.8,4.9,4.1,7.1,4.7,5.9,7.8,10.2,7.5,6.4,7.0,0.0,9.0,7.3,2.9,8.7,6.1,7.0,5.4,5.3,5.3,4.1,7.0,5.0,7.1,7.7,9.9,4.5,6.3,3.8,5.2,7.8,6.9,7.2,9.5,6.3,5.1,6.9,7.3,6.8,7.7,3.5,4.6,6.0,6.2,0.0,0.0,5.9,2.6,7.2,3.5,3.8,8.8,4.9,0.0,3.9,7.5,4.1,2.8,13.9,3.1,5.9,1.9,8.5,4.6,6.7,3.9,3.9,0.0,8.9,5.1,6.1,6.1,5.1,3.9,3.6,7.2,5.1,7.6,6.3,4.9,3.6,0.0,5.4,0.0,4.6,7.7,8.2,4.2,3.2,6.5,4.6,2.5,3.6,5.2,7.8,3.0,4.8,5.6,4.3,3.7,7.1,5.5,5.0,4.9,4.0,4.8,5.1,4.9,4.0,0.0,6.2,6.5,4.3,4.2,7.2,2.0,5.4,3.9,6.1,5.6,5.6,5.6,3.7,4.8,0.0,4.7,7.4,7.9,7.7,5.1,9.7,5.4,3.9,1.5,7.7,7.4],
  "21": [0,7.3,4.5,7.3,7.9,4.5,7.5,7.8,3.7,8.5,3.7,6.4,3.8,7.1,7.4,8.9,5.1,6.2,5.4,8.4],
  "22": [0,7.7,8.2,8.6,8.6,12.6,9.3,6.5,9.3,6.2,7.6,8.0,9.1,11.6,8.0,6.0,8.0,5.2,8.2,5.7,7.7,10.1,4.6,7.0,8.4,9.5,6.7,5.0,7.8,7.7,7.9,8.5,8.6,9.0,7.2,6.8,8.7],
  "30": [0,6.6,3.4,5.4,0.0,4.7,5.4,6.1,4.2,5.4,6.3,5.3,6.8,5.2,2.7,9.1,6.4,5.9,7.8,7.2,4.8,5.0,6.5,5.8,5.5,8.8,6.4,8.4,5.6,5.9,4.7,5.6,8.4,6.1,5.7,5.3,3.0,5.7,7.2,4.8,6.9,5.4,0.0,7.0,5.8,7.4,5.2,9.5,7.5,3.8,6.5,6.6,9.0,6.5,8.0,6.2,4.2,0.0,11.1,7.3,6.2,10.8,6.4,5.9,7.7,5.3,7.5,3.0,6.6,6.2,0.0,0.0,8.0,6.4,7.3,8.0,4.0,6.0,4.9,5.4,5.2,6.8,2.8,5.6,6.0,5.3,5.2,8.7,7.5,7.7,6.1,7.9,7.7,6.4,8.2,7.9,6.0,7.6,4.5,8.4,0.0,3.0,4.8,6.4,5.4,8.3,3.6,7.3,5.4,9.6,5.8,4.8,7.6,5.4,4.4,4.6,7.3,5.8,4.5,6.3,5.3,8.5,5.3,4.9,9.5,5.4,11.9,4.6,8.0,9.2,4.2,6.4,6.0,5.8,4.0,4.9,5.8,0.0,5.4,6.1,6.4,5.3,5.6,8.8,5.9,9.4,7.0,4.8,6.7,6.6,6.1,9.1,6.4,8.0,7.8,7.3,7.3,8.0,6.6,8.0,5.3,4.8,2.9,6.4,5.3,5.0,6.5,0.0,4.3,5.0,5.7,4.5,5.4,5.9,4.5,4.4,4.8,4.5,5.1,5.3,8.7,4.8,3.9,6.5,5.4,6.1,5.8,0.0,8.5,6.1,6.4,9.1,5.4,5.0,4.7,10.0,0,0,0,0],
  "40": [0,8.2,6.9,5.1,5.8,6.3,0.0,4.1,8.5,5.9,8.6,4.7,6.3,7.0,4.1,6.2,4.6,5.5,5.8,7.9,8.7,10.0,7.5,4.4,10.5,10.3,10.3,8.8,6.7,6.3,8.1,8.0,6.6,5.7,4.7,5.1,4.9,0.0,0.0,7.1,8.4,6.2,7.2,5.3,2.8,7.9,4.5,4.7,3.4,7.1,6.2,9.0,7.3,6.5,5.3,7.8,9.0,5.0,6.2,7.5,7.6,6.1,6.9,7.5,5.3,8.1,6.9,8.5,5.2,14.5,3.0,5.3,8.6,6.2,5.7,0.0,5.4,0.0,5.7,6.0,6.8,7.6,8.1,11.2,7.7,8.2,5.9,5.3,5.9,5.7,7.5,4.1,9.0,5.7,0.0,10.4,9.1,6.2,5.0,5.3,8.8,6.3,8.1,6.6,11.2,7.9,7.0,6.3,6.4,0.0,8.0,6.0,7.0,7.2,5.4,7.0,6.4,3.2,7.6,7.1,5.9,6.1,4.9,6.6,7.1,7.4,10.2,7.2,5.8,4.3,5.8,5.1,3.6,0.0,8.1,9.5,11.6,7.8,7.7,7.1,6.3,8.4,7.6,7.1,9.9,8.2,6.9,6.0,0.0,5.5,7.3,4.2,5.5,7.2,0.0,5.5,2.9,5.2,5.7,7.4,7.2,9.2,5.5,13.8,6.4,3.9,5.9,7.8,8.8,6.7,8.7,6.8,8.8,6.1,4.2,7.8,5.2,8.2,6.3,3.9,5.7,0.0,5.6,0.0,5.0,6.4,4.8,8.7,6.0,3.9,4.5,6.9,6.4,4.7,6.1,7.8,8.6,6.0,7.7,2.1,5.4,5.4,6.2,9.1,8.8,6.5,7.9,7.6,11.4,8.5,7.3,11.5,10.4,4.2,5.5,6.2,6.4,6.2,8.0,5.7,7.2],
  "50": [0,6.0,5.7,9.1,5.1,6.1,7.2,8.9,9.0,5.4,5.8,6.8,5.8,8.5,6.4,6.1,5.3,8.3,8.7,7.3,7.5,7.9,7.2,0,7.2,7.3,8.0,5.5,10.6,8.0,10.8,7.2,5.7,8.3,5.9,8.7,6.3,5.1,5.0,0,3.6,7.2,6.9,6.8,6.1,5.1,5.3,6.0,7.3,10.7,6.1,5.8,6.6,4.8,6.8,5.1,7.3,10.3,10.6,0,8.9,6.1,9.6,11.5,8.9,6.1,7.0,7.5,6.1,9.6,5.1,5.2,5.9,0,5.7,3.3,7.7,9.6,6.1,5.3,12.1,9.1,7.3,4.1,11.9,7.0,7.3,4.3,7.5,5.0,5.9,8.1,5.2,5.8,7.2,8.1,5.4,8.1,6.4,5.3,10.6,11.7,7.4,8.6,6.1,7.0,5.0,6.7,6.2,5.1,5.9,6.7,6.2,5.8,5.6,9.4,5.5,7.6,7.3,7.7,4.4,7.6,6.5,9.4,5.5,5.4,6.9,6.7,6.0,0,9.6,3.5,6.9,9.0,8.4,5.0,7.2,4.5,7.2,3.7,10.4,5.3,6.2,5.5,5.1,7.2,6.8,4.5,0,7.5,11.5,6.1,4.4,6.8,7.2,7.4,8.8,5.1,5.5,10.9,4.8,6.8,6.4,6.1,7.7,4.1,6.5,6.7,7.2,11.0,10.6,7.8,9.9,5.8,6.7,9.8,7.1,8.2,5.8,6.9,5.2,0,4.2,6.8,6.9,5.9,7.2,4.3,6.9,7.3,8.0,8.1,9.9,6.3,6.6,7.5,7.7,6.0,7.4,5.9,4.6,6.9,5.9,7.5,4.2,0,9.2,7.1,7.8,6.1,7.1,6.3,4.9,11.2,3.7,6.5,6.2,9.2,5.4,8.9,4.4],
  "60": [0,6.0,6.2,5.5,6.3,6.4,7.8,5.0,6.0,6.6,6.6,7.4,6.8,7.0,7.8,4.9,4.8,6.2,5.9,5.2,7.1,4.1,0.0,5.1,8.7,8.2,5.8,9.9,5.8,5.6,7.5,7.1,8.0,3.6,14.4,8.5,9.0,7.8,8.6,7.5,5.6,0.0,7.3,7.6,7.1,7.7,6.9,7.2,6.4,8.2,7.2,7.2,4.3,8.6,8.9,7.5,6.9,7.4,5.2,7.6,8.7,7.3,5.7,5.3,9.3,7.1,12.7,5.1,7.9,5.1,8.3,9.1,3.6,7.3,5.0,0.0,4.8,6.4,8.4,7.1,5.9,7.5,8.2,3.5,7.4,6.8,5.3,6.3,6.9,5.1,6.4,9.4,5.1,6.2,7.6,5.7,5.3,8.7,8.4,6.7,6.5,5.1,9.3,9.7,6.3,9.2,10.3,6.0,5.5,6.4,4.3,4.0,5.0,0.0,5.9,8.3,6.3,6.8,8.1,5.9,6.4,4.2,7.3,7.2,4.4,6.6,5.8,5.8,10.4,8.1,7.9,8.9,4.6,6.7,11.6,7.0,8.4,6.7,9.0,7.5,5.9,8.8,6.1,9.3,4.6,4.2,8.9,7.2,4.9,0.0,4.4,4.7,6.3,7.2,8.1,8.8,5.8,4.1,7.3,9.0,8.8,6.0,7.7,8.1,6.1,13.4,7.2,3.4,5.6,5.4,8.3,6.6,7.6,6.3,8.5,5.3,11.5,5.0,3.8,8.9,7.6,5.9,9.1,5.8,4.2,4.7,4.2,7.6,0.0,7.0,6.4,5.7,5.6,4.2,8.3,10.2,2.8,8.7,6.7,6.1,5.9,7.4,8.5,5.5,6.1,5.0,7.1,11.6,7.2,6.7,8.1,6.0,5.2,10.4,9.3,6.8,9.5,9.7,7.5,5.5,4.8],
  "70": [0,5.0,5.4,7.7,9.7,6.4,4.1,7.6,12.0,6.4,9.9,7.0,5.8,12.1,11.5,10.2,9.0,6.7,5.3,6.4,9.7,9.7,11.4,0,8.7,7.3,9.2,6.5,4.5,6.7,6.3,8.6,11.6,5.6,6.4,14.7,9.8,10.3,0.0,6.6,5.7,7.0,5.6,7.1,8.4,6.9,9.8,8.2,10.8,8.0,8.2,11.1,3.6,10.3,9.4,6.3,5.9,4.6,5.1,5.2,4.2,10.0,7.7,8.7,6.5,6.7,5.4,7.6,8.6,6.3,6.8,6.2,8.8,7.9,7.1,7.8,8.5,6.1,7.1,5.1,5.5,0,6.2,7.3,5.5,3.3,6.5,8.2,6.0,4.9,7.0,5.2,4.1,9.6,7.1,7.1,5.2,7.1,7.5,8.7,11.0,7.4,6.6,7.6,7.7,9.8,5.6,6.0,5.7,9.6,8.8,9.2,8.4,3.7,5.6,5.5,5.5,6.4,10.0,7.9,8.5,8.6,6.1,8.1,7.1,5.8,6.3,4.9,8.1,5.5,7.4,5.0,4.6,7.1,0.0,4.8,8.0,9.2,7.7,5.5,7.0,8.9,4.9,9.4,9.4,7.0,5.5,5.5,7.2,0.0,5.0,5.4,5.9,7.2,7.3,7.2,6.0,4.8,9.0,8.8,9.4,6.8,6.1,5.8,5.4,12.6,6.7,8.1,6.9,6.5,9.0,11.6,4.6,7.9,6.9,8.4,7.3,6.5,6.1,7.5,9.1,7.0,5.9,5.4,6.3,4.3,6.0,7.1,4.5,2.5,0.0,10.2,5.1,6.1,6.8,7.8,6.6,9.3,7.5,4.1,5.9,5.4,6.0,6.1,7.3,7.7,0.0,4.7,5.6,9.9,5.6,8.5,8.8,8.3,5.8,4.8,5.6,6.9,4.8,9.4,5.5]
}

export function get_karapet_score(set, card){
  if(karapet_score[set] && karapet_score[set][card]) return karapet_score[set][card];
  return 0.0;
}

function shuffleArray(array, rng=Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
    return array;
}


function prepareCardsByRarityAndColor(cards, set_id) {
  const cardsByRarityAndColor = {1: {}, 2: {}, 3: {}, 4: {}};

  cards.forEach(card => {
    if (card.set_id === set_id && card.altto === null) {
      if (!cardsByRarityAndColor[card.rarity][card.color])
        cardsByRarityAndColor[card.rarity][card.color] = [];
      cardsByRarityAndColor[card.rarity][card.color].push(card.id);
    }
  });

  return cardsByRarityAndColor;
}

function mergeTwoRarities(cardsByRarityAndColor, rarity1, rarity2) {
  const mergedCards = {};
  for (const color in cardsByRarityAndColor[rarity1]) {
    if (!mergedCards[color]) mergedCards[color] = [];
    mergedCards[color].push(...cardsByRarityAndColor[rarity1][color]);
  }
  for (const color in cardsByRarityAndColor[rarity2]) {
    if (!mergedCards[color]) mergedCards[color] = [];
    mergedCards[color].push(...cardsByRarityAndColor[rarity2][color]);
  }
  return mergedCards;
}

function getBoosterV2(cardsByRarityAndColor, rng) {
  function selectRandomCardsFromDifferentColors(cardsByColor, count, excludeCards = []) {
    const colors = Object.keys(cardsByColor);
    const selectedColors = shuffleArray(colors, rng).slice(0, count);
    return selectedColors.flatMap(color =>
      selectRandomCards(cardsByColor[color].filter(card => !excludeCards.includes(card)), 1));
  }

  function selectRandomCards(cardsArray, count) {
    const shuffled = shuffleArray(cardsArray, rng);
    return shuffled.slice(0, count);
  }

  const booster = [];
  booster.push(...((rng() < 4 / 24 && Object.keys(cardsByRarityAndColor[4]).length > 0) ? selectRandomCardsFromDifferentColors(cardsByRarityAndColor[4], 1) : selectRandomCardsFromDifferentColors(cardsByRarityAndColor[3], 1)));
  booster.push(...selectRandomCardsFromDifferentColors(cardsByRarityAndColor[2], 3));
  const commonSelectedColors = selectRandomCardsFromDifferentColors(cardsByRarityAndColor[1], 6);
  booster.push(...commonSelectedColors);
  booster.push(...selectRandomCardsFromDifferentColors(cardsByRarityAndColor[1], 2, (rng < 1 / 100) ? [] : commonSelectedColors));

  return booster;
}

function getBoosterV3(cardsByRarityAndColor, rng) {
  function selectRandomCardsFromAll(cardsByColor, count, excludeCards = []) {
    const allCards = Object.values(cardsByColor).flat()
    const filteredCards = allCards.filter(card => !excludeCards.includes(card))
    return selectRandomCards(filteredCards, count)
  }

  function selectRandomCards(cardsArray, count) {
    const shuffled = shuffleArray(cardsArray, rng)
    return shuffled.slice(0, count)
  }

  const booster = []

  if (rng() < 4 / 24 && Object.keys(cardsByRarityAndColor[4]).length > 0) {
    booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[4], 1))
  } else {
    booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[3], 1))
  }

  if(rng() < 1 / 100){
    booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[2], 2))
    booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[2], 1))
  } else {
    booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[2], 3))
  }

  const commonSelected = selectRandomCardsFromAll(cardsByRarityAndColor[1], 6)
  booster.push(...commonSelected)
  booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[1], 2, (rng() < 1 / 100) ? [] : commonSelected))

  return booster
}

function getBoosterTesting(cardsByRarityAndColor, rng) {
  function selectRandomCardsFromAll(cardsByColor, count, excludeCards = []) {
    const allCards = Object.values(cardsByColor).flat()
    const filteredCards = allCards.filter(card => !excludeCards.includes(card))
    return selectRandomCards(filteredCards, count)
  }

  function selectRandomCards(cardsArray, count) {
    const shuffled = shuffleArray(cardsArray, rng)
    return shuffled.slice(0, count)
  }

  const booster = []

  const mergedCards = mergeTwoRarities(cardsByRarityAndColor, 3, 4)
  booster.push(...selectRandomCardsFromAll(mergedCards, 1))

  if(rng() < 1 / 100){
    booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[2], 2))
    booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[2], 1))
  } else {
    booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[2], 3))
  }

  const commonSelected = selectRandomCardsFromAll(cardsByRarityAndColor[1], 6)
  booster.push(...commonSelected)
  booster.push(...selectRandomCardsFromAll(cardsByRarityAndColor[1], 2, (rng() < 1 / 100) ? [] : commonSelected))

  return booster
}

export function getBooster(cards, set_id, rng=Math.random, testing_mode=false) {
  const cardsByRarityAndColor = prepareCardsByRarityAndColor(cards, set_id);
  if(testing_mode && set_id >= 1000) return getBoosterTesting(cardsByRarityAndColor, rng)
  return set_id < 50 ? getBoosterV2(cardsByRarityAndColor, rng) : getBoosterV3(cardsByRarityAndColor, rng);
}

function doKarapetPick(booster) {
  if (booster.length <= 1) return 0;

  const set = booster[0].set_id;
  const weights = karapet_score[set] || [];

  let boosterWeights = booster.map((card, index) => {
    return {
      weight: weights[card.number],
      index: index
    }
  });

  boosterWeights.sort((a, b) => b.weight - a.weight);
  if (boosterWeights.length < 3)
    return boosterWeights[0].index;

  const topThreeWeights = boosterWeights.slice(0, 3);

  if (topThreeWeights[0].weight / topThreeWeights[2].weight < 1.1) {
    const randomIndex = Math.floor(Math.random() * topThreeWeights.length);
    return topThreeWeights[randomIndex].index;
  } else {
    return topThreeWeights[0].index;
  }
}

function doMotdOrderedPick(booster, random = true) {
  if (booster.length <= 1) return 0;
  const set = booster[0].set_id;
  const weights = motd_order[set] || [];
  let boosterWeights = booster.map((card, index) => {
    const pos = weights.indexOf(card.number)
    return {weight: pos > -1 ? pos : 1000, index: index}
  })
  boosterWeights.sort((a, b) => a.weight - b.weight);
  const topCards = boosterWeights.slice(0, 3);
  const rand = random ? Math.random() * 100 : 0;
  if (rand < 80) {
    return topCards[0]?.index ?? 0;
  } else if (rand < 95) {
    return topCards[1]?.index ?? topCards[0]?.index ?? 0;
  } else {
    return topCards[2]?.index ?? topCards[1]?.index ?? topCards[0]?.index ?? 0;
  }
}

function doOrderedPick(booster, orderd_weight) {
  if (booster.length <= 1) return 0;
  const set = booster[0].set_id;
  const weights = orderd_weight[set] || [];
  let boosterWeights = booster.map((card, index) => {
    const pos = weights.indexOf(card.number)
    return {weight: pos > -1 ? pos : 1000, index: index}
  })
  boosterWeights.sort((a, b) => a.weight - b.weight);
  return boosterWeights[0].index;
}

export function validUserWeights(str){
  let obj;
  try {
    obj = JSON.parse(str);
  } catch (e) {
    return false;
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return false;
  for (const key in obj) {
    if (!Array.isArray(obj[key])) return false;
  }
  return true;
}

export async function doAIPick(current_deck, booster) {
  try {
    const res = await window.electron.ipcRenderer.invoke('predict-pick', current_deck.filter((x) => x), booster.map((card) => card['id']))
    return res.chosen_index
  } catch (e) {
    return doPick(booster, 'motd')
  }
}

export function doPick(booster, type, orderd_weight){
  orderd_weight = orderd_weight || '{"10":[],"20":[],"30":[],"40":[],"50":[]}'
  if(type === 'user' && validUserWeights(orderd_weight))
    return doOrderedPick(booster, JSON.parse(orderd_weight))
  if((type || 'motd') === 'motd')
    return doMotdOrderedPick(booster)
  if((type || 'motd') === 'karapet')
    return doKarapetPick(booster)
  return doMotdOrderedPick(booster, false)
}

export function formatCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}
