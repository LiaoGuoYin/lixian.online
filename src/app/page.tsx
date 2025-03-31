"use client";

import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import VSCodeDownloader from "@/components/VSCodeDownloader";
import DockerDownloader from "@/components/DockerDownloader";

export default function Home() {
  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" mb={8} textAlign="center">
        OffDown - 离线下载工具
      </Heading>

      <Tabs isFitted variant="enclosed">
        <TabList mb="1em">
          <Tab>VSCode 插件下载</Tab>
          {/* <Tab>Docker 镜像下载</Tab> */}
        </TabList>

        <TabPanels>
          <TabPanel>
            <VSCodeDownloader />
          </TabPanel>
          <TabPanel>{/* <DockerDownloader /> */}</TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
}
