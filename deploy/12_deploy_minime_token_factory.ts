import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const minimeFactory = await deploy('MiniMeTokenFactory', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts({
      name: 'MiniMeTokenFactory',
      address: minimeFactory.address,
    });

    await hre.tenderly.verify({
      name: 'MiniMeTokenFactory',
      address: minimeFactory.address,
    });
  }
};

export default func;

func.tags = ['MiniMeTokenFactory'];
