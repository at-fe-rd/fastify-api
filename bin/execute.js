#!/usr/bin/env node
/**
 * This is readonly file
 */
const inquirer = require('inquirer');
const fs = require('fs');
const shell = require('shelljs');

const projectDir = process.cwd();
const srcDir = `${projectDir}/src/`;
const templateDir = `${projectDir}/bin/templates/`;
const routeDir = `${srcDir}routes/`;
let folderDir = '';

let notification = {
  added: [],
  modified: []
};

const CREATING_MODEL_STEPS = [
  {
    name: 'model',
    type: 'input',
    message: 'Enter your model:',
    validate: function (input) {
      if (/^[a-z]+-?[a-z]+$/.test(input)) {
        return true;
      } else {
        return 'Model name may only include lower letters or kebab-case.';
        // return 'Model name may only include lower letters.';
      }
    }
  },
  {
    name: 'hasRouting',
    type: 'confirm',
    message: 'Init CRUD actions and routing?'
  }
];

const CREATING_CONTROLLER_STEPS = [
  {
    name: 'name',
    type: 'input',
    message: 'Enter your controller:',
    validate: function (input) {
      if (/^[a-z]+\/?[a-z]+$/.test(input)) {
        return true;
      } else {
        return 'Controller name may only include lower letters or kebab-case.';
      }
    }
  }
];

generatingModel = () => {
  inquirer.prompt(CREATING_MODEL_STEPS).then((answers) => {
    const modelName = answers['model'];
    if (answers['hasRouting']) {
      const QUESTIONS = [
        {
          name: 'route',
          type: 'list',
          message: 'Choise the right route?',
          choices: [`${modelName}s`, modelName]
        }
      ];
      inquirer.prompt(QUESTIONS).then((choices) => {
        processFiles(modelName, choices['route'])
      });
    }
  });
}

generatingController = () => {
  inquirer.prompt(CREATING_CONTROLLER_STEPS).then((answers) => {
    const name = answers['name'];
    processController(name);
  });
}

generatingController();
// generatingModel();

processController = (str) => {
  let hasFolder = false;
  let arr = str.split('/');
  let length = arr.length;
  let controllerName = '';
  let folderName = '';
  if (length === 1) {
    controllerName = arr[0];
  } else {
    hasFolder = true;
    controllerName = arr[length - 1];
    folderName = str.replace(`/${controllerName}`, '');
  }
  shell.mkdir('-p', `${srcDir}${folderName}`);
}

processFiles = (model, route) => {
  const isCountable = model === route;
  let msgs = [];
  const modelName = kebabToUpperCamel(model);
  const schemaName = kebabToCamel(model);
  const targets = {
    model: {
      dir: `${srcDir}models`,
      fileName: `${model}.model.js`,
      name: modelName
    },
    controller: {
      dir: `${srcDir}controllers`,
      fileName: `${model}.controller.js`,
      name: model
    },
    route: {
      dir: `${srcDir}routes`,
      fileName: `${model}.route.js`,
      name: model,
      isUncountable: model === route
    },
    schema: {
      dir: `${srcDir}routes/documentation`,
      fileName: `${model}.schema.js`,
      name: schemaName
    }
  };
  msgs.push(`
  \nCompleted!!!
  \nFiles Added:
  `);
  let changedFile = '';
  for (let key in targets) {
    const newFile = createDirectoryContents(key, targets[key]);
    msgs.push(newFile);
    if (key === 'route') {
      // change route index
      changedFile = changeRouteIndex(model);
    }
  }; 
  msgs.push(`------------------------------------
  \nFiles Changed:
  `);
  msgs.push(changedFile);
  console.log(msgs.join('\n'));
}

createDirectoryContents = (fileName, targetDirs) => {
  const origFilePath = `${templateDir}${fileName}.js`;
  const stats = fs.statSync(origFilePath);

  if (stats.isFile()) {
    const writePath = `${targetDirs['dir']}/${targetDirs['fileName']}`;
    if (fs.existsSync(writePath)) {
      console.log(`${writePath} file already exists.`);
    } else {
      let contents = fs.readFileSync(origFilePath, 'utf8');
      contents = contents.replace(/__MODEL__/g, targetDirs['name']);
      contents = contents.replace(/'__ISUNCOUNTABLE__'/g, targetDirs['isUncountable'] ? ', true' : '');
      fs.writeFileSync(writePath, contents, 'utf8');
      return writePath;
    }
  } else if (stats.isDirectory()) {
    // fs.mkdirSync(`${CURR_DIR}/${newProjectPath}/${file}`);
    // // recursive call
    // createDirectoryContents(`${templatePath}/${file}`, `${newProjectPath}/${file}`);
  }
}

changeRouteIndex = (model) => {
  const indexRoutes = `${routeDir}index.js`;
  let contents = fs.readFileSync(`${indexRoutes}`, 'utf8');
  regex = /(module\.exports = \[)(.|\n)*(\])/g;
  checkLastLine = /.+[,].*\n\]$/g;
  checkLastLineNoCmt = /[\.a-z]+\n*\]/g;
  checkBreakline = /\n*(?=(module\.exports = \[)(.|\n)*(\]))/g;
  checkModuleNull = /(module\.exports = \[)(\n)*(\])/g;
  findModuleToInsertImport = /\n(?=\nmodule\.exports)/g;
  let namefile = 'abc';
  if(regex.test(contents) ) {
    const routeName = `${model}Route`;
    let importcontents = `\n\t...${routeName}\n]`;
    switch (true) {
      case checkModuleNull.test(contents):
        break;
      case checkLastLineNoCmt.test(contents):
        importcontents = `,${importcontents}`;
        break
      case checkLastLine.test(contents):
        break
      default:
        contents = contents.replace(/\s(?=\/\/.*\n*\])/g, `, `);
    }
    // import route name
    contents = contents.replace(/\n*\]/g, importcontents);
    const requiredcontents = `const ${routeName} = require('./${model}.route')`;
    contents = contents.replace(checkBreakline, '\n');
    // require route
    contents = contents.replace(findModuleToInsertImport, `\n${requiredcontents}\n`);
  } else {
    console.log('Can not import new route. Please do it manually!');
  }
  fs.writeFileSync(`${indexRoutes}`, contents, 'utf8');
  return `${indexRoutes}`;
}

kebabToCamel = (string) => {
  return string = string.replace(/-([a-z])/g, (g) => {
    return g[1].toUpperCase(); 
  });
};

kebabToUpperCamel = (string) => {
  string = string.replace(/-([a-z])/g, (g) => {
    return g[1].toUpperCase(); 
  });
  return string.replace(/\b\w/g, (l) => l.toUpperCase());
};