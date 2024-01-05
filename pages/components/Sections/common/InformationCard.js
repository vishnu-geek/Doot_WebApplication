import { Flex } from "@chakra-ui/react";

export default function InformationCard({ children }) {
  return (
    <>
      <Flex
        direction={"column"}
        align={"center"}
        gap={5}
        pt={10}
        pb={10}
        pl={5}
        pr={5}
        maxW={"30%"}
        bg={`linear-gradient(0deg, rgba(5,3,0,1) 0%, rgba(45,0,88,1) 100%)`}
        borderRadius={10}
        transition={"0.5s"}
        border="2px solid #a364ff"
        boxShadow="10px 10px 2px #6c35de"
        _hover={{
          border: "2px solid #00ce74",
          boxShadow: "10px 10px 2px #16d07f",
        }}
      >
        {children}
      </Flex>
    </>
  );
}
