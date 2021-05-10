import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const kernelBase = await deploy('Kernel', {
    from: deployer,
    args: [true], // immediately petrify
    log: true,
    deterministicDeployment: true,
  });

  if (process.env.VERIFY) {
    await hre.tenderly.persistArtifacts({
      name: 'Kernel',
      address: kernelBase.address,
    });

    await hre.tenderly.verify({
      name: 'Kernel',
      address: kernelBase.address,
    });
  }
};

export default func;

func.tags = ['Kernel'];
