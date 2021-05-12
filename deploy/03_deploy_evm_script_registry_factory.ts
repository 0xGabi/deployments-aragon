import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const evmScriptRegsitryFactory = await deploy('EVMScriptRegistryFactory', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts({
      name: 'EVMScriptRegistryFactory',
      address: evmScriptRegsitryFactory.address,
    });

    await hre.tenderly.verify({
      name: 'EVMScriptRegistryFactory',
      address: evmScriptRegsitryFactory.address,
    });
  }
};

export default func;

func.tags = ['EVMScriptRegistryFactory'];
