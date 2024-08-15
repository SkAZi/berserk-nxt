import { dialog, Notification } from 'electron';
import { is } from '@electron-toolkit/utils';
import { join, basename, extname } from 'path';
import axios from 'axios';
import fs from 'fs-extra';
import os from 'os';
import AdmZip from 'adm-zip';

const resources_path = is.dev ? join(__dirname, '../../resources') : join(process.resourcesPath, 'app.asar.unpacked', 'resources');
let localVersion;
try {
  localVersion = JSON.parse(fs.readFileSync(join(resources_path, 'version.json'), 'utf8'));
} catch (error) {
  localVersion = {
    "channel": "https://raw.githubusercontent.com/SkAZi/bersency-nxt-release/main/",
    "const.json": "",
    "data.json": "",
    "cards": []
  }
}

export async function checkForUpdates(win) {
  try {
    const response = await axios.get(localVersion["channel"] + "version.json");
    const remoteVersion = response.data;

    if (remoteVersion["const.json"] > localVersion["const.json"]
        || remoteVersion["data.json"] > localVersion["data.json"]
        || remoteVersion["cards"][remoteVersion["cards"].length-1] > localVersion["cards"][localVersion["cards"].length-1]) {

      const userChoice = dialog.showMessageBoxSync(win, {
        type: 'question',
        buttons: ['Да', 'Нет'],
        title: 'Доступно обновление данных',
        message: 'Доступно обновление данных. Загрузить сейчас?'
      });

      if (userChoice === 0) {
        new Notification({ title: 'Загрузка', body: 'Гружу файлы, это займёт какое-то время, потерпи немного, пожалуйста.' }).show();
        await updateContent(localVersion, remoteVersion);
        return true
      }
    }
  } catch (error) {
    console.error('Failed to check for updates:', error);
  }
  return false
}

async function updateContent(localVersion, remoteVersion){
  const const_js = (await axios.get(localVersion["channel"] + "const.json", { transformResponse: [function(data) { return data; }] })).data;
  const data_js = (await axios.get(localVersion["channel"] + "data.json", { transformResponse: [function(data) { return data; }] })).data;

  const updates = remoteVersion.cards.slice(localVersion.cards.lastIndexOf(localVersion.cards.find(x => remoteVersion.cards.includes(x))) + 1);

  for (let url of updates) {
    const filename = basename(url);
    const zipPath = join(os.tmpdir(), filename);
    const extractPath = join(os.tmpdir(), basename(filename, extname(filename)));
    fs.ensureDirSync(extractPath);

    const response = await axios({method: 'get', url: url, responseType: 'arraybuffer'});
    fs.writeFileSync(zipPath, Buffer.from(response.data, 'binary'));

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);
    fs.unlinkSync(zipPath);

    const targetPath = join(resources_path, 'cards');
    fs.ensureDirSync(targetPath);

    await fs.copy(extractPath, targetPath, { overwrite: true });
    fs.rmdirSync(extractPath, { recursive: true });
  }

  fs.writeFileSync(join(resources_path, 'const.json'), const_js)
  fs.writeFileSync(join(resources_path, 'data.json'), data_js)
  fs.writeFileSync(join(resources_path, 'version.json'), JSON.stringify(remoteVersion, null, ' '))
}

export function installAddon(zipPath) {
  try {
    const extractPath = join(os.tmpdir(), basename(zipPath, extname(zipPath)))
    fs.ensureDirSync(extractPath)

    const zip = new AdmZip(zipPath)
    zip.extractAllTo(extractPath, true)

    const baseName = basename(zipPath, extname(zipPath));
    const addonFileName = `addon-${baseName.replace('addon-','')}.json`;

    fs.copySync(join(extractPath, 'addon.json'), join(resources_path, addonFileName), { overwrite: true })

    const targetPath = join(resources_path, 'cards')
    fs.ensureDirSync(targetPath)
    fs.copySync(join(extractPath, 'cards'), targetPath, { overwrite: true })

    fs.rmdirSync(extractPath, { recursive: true })
    return true
  } catch (error) {
    console.error('Failed to install addon:', error)
    return false
  }
}

export function deinstallAddon(name) {
  fs.removeSync(join(resources_path, name))
  return true
}
